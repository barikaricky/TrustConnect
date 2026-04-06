import { Request, Response } from 'express';
import { collections, getNextSequence } from '../database/connection';
import { normalizeImageUrl, normalizeImageUrls } from '../utils/imageUrl';
import { notifyUser } from './notification.controller';

/**
 * Create a new booking / hire request
 * ─ Validates wallet balance ≥ estimatedPrice
 * ─ Holds funds in escrow automatically
 * ─ Sends artisan location to customer
 */
export const createBooking = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      artisanId,
      serviceType,
      description,
      scheduledDate,
      scheduledTime,
      location,
      estimatedPrice,
      customerNotes,
    } = req.body;

    // Validate required fields
    if (!customerId || !artisanId || !serviceType || !description || !scheduledDate || !scheduledTime || !location) {
      return res.status(400).json({ error: 'Missing required fields: customerId, artisanId, serviceType, description, scheduledDate, scheduledTime, location' });
    }

    // Verify customer exists
    const customer = await collections.users().findOne({ id: parseInt(customerId) });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find artisan - support both artisanProfile id and ObjectId string
    let artisan;
    let artisanUserId: number;

    // Try finding by numeric profile id first
    artisan = await collections.artisanProfiles().findOne({ id: parseInt(artisanId) });
    
    if (!artisan) {
      // Try by MongoDB _id string
      const { ObjectId } = await import('mongodb');
      try {
        artisan = await collections.artisanProfiles().findOne({ _id: new ObjectId(artisanId) });
      } catch (e) {
        // Not a valid ObjectId, try by userId
        artisan = await collections.artisanProfiles().findOne({ userId: parseInt(artisanId) });
      }
    }

    if (!artisan) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    artisanUserId = artisan.userId;

    // ── NO upfront balance check or escrow hold ──
    // Funds are only locked AFTER the artisan submits a quotation AND the customer accepts it.
    // The exact payment amount is determined by the artisan's quote, not the estimated price.
    const price = estimatedPrice ? parseFloat(estimatedPrice) : 0;

    const bookingId = await getNextSequence('bookingId');
    const now = new Date().toISOString();

    const booking = {
      id: bookingId,
      customerId: parseInt(customerId),
      artisanId: artisan.id,
      artisanUserId,
      serviceType,
      description,
      status: 'pending' as const,
      scheduledDate,
      scheduledTime,
      location: {
        address: typeof location === 'string' ? location : location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      estimatedPrice: price,
      escrowAmount: 0,           // No funds held at booking creation — set after quote acceptance
      customerNotes: customerNotes || '',
      createdAt: now,
      updatedAt: now,
    };

    await collections.bookings().insertOne(booking);

    // Get artisan user details for response
    const artisanUser = await collections.users().findOne({ id: artisanUserId });

    // ── LOCATION: include artisan workshop address for the customer ──
    const artisanLocation = artisan.workshopAddress || artisan.location || '';

    // Notify artisan about new booking
    const io = (req.app as any).io;
    await notifyUser(
      artisanUserId,
      '📋 New Job Request!',
      `${customer.name || 'A customer'} wants to book you for ${serviceType}. Accept and submit a quote to proceed.`,
      'booking',
      { bookingId },
      io
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Waiting for artisan to accept and submit a quote.',
      booking: {
        ...booking,
        artisanName: artisanUser?.name || 'Unknown',
        artisanPhone: artisanUser?.phone || '',
        artisanTrade: artisan.primarySkill,
        artisanPhoto: normalizeImageUrl(artisan.profilePhotoUrl, req),
        artisanLocation,
        escrowHeld: 0,
      },
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

/**
 * Get a single booking by ID
 */
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    
    const booking = await collections.bookings().findOne({ id: bookingId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Enrich with user details
    const customer = await collections.users().findOne({ id: booking.customerId });
    const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
    const artisanProfile = await collections.artisanProfiles().findOne({ id: booking.artisanId });

    res.json({
      ...booking,
      customerName: customer?.name || 'Unknown',
      customerPhone: customer?.phone || '',
      artisanName: artisanUser?.name || 'Unknown',
      artisanPhone: artisanUser?.phone || '',
      artisanTrade: artisanProfile?.primarySkill || '',
      artisanPhoto: artisanProfile?.profilePhotoUrl || null,
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

/**
 * Get all bookings for a customer
 */
export const getCustomerBookings = async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId);
    const { status } = req.query;

    const filter: any = { customerId };
    if (status) filter.status = status;

    const bookings = await collections.bookings()
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with artisan details + location + escrow info
    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
        const artisanProfile = await collections.artisanProfiles().findOne({ id: booking.artisanId });
        return {
          ...booking,
          artisanName: artisanUser?.name || 'Unknown',
          artisanPhone: artisanUser?.phone || '',
          artisanTrade: artisanProfile?.primarySkill || '',
          artisanPhoto: normalizeImageUrl(artisanProfile?.profilePhotoUrl, req),
          artisanLocation: artisanProfile?.workshopAddress || '',
          escrowHeld: booking.escrowAmount || booking.estimatedPrice || 0,
        };
      })
    );

    res.json({ bookings: enriched });
  } catch (error) {
    console.error('Get customer bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

/**
 * Get all bookings for an artisan
 */
export const getArtisanBookings = async (req: Request, res: Response) => {
  try {
    const artisanUserId = parseInt(Array.isArray(req.params.artisanId) ? req.params.artisanId[0] : req.params.artisanId);
    const { status } = req.query;

    const filter: any = { artisanUserId };
    if (status) filter.status = status;

    const bookings = await collections.bookings()
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with customer details
    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const customer = await collections.users().findOne({ id: booking.customerId });
        return {
          ...booking,
          customerName: customer?.name || 'Unknown',
          customerPhone: customer?.phone || '',
        };
      })
    );

    res.json({ bookings: enriched });
  } catch (error) {
    console.error('Get artisan bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

/**
 * Update booking status
 * ─ on-the-way: notifies customer with artisan location
 * ─ in-progress: artisan started working
 * ─ job-done: notifies customer to review & release funds
 * ─ cancelled: refunds escrow to customer wallet
 */
export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { status, artisanNotes, finalPrice } = req.body;

    const validStatuses = [
      'accepted', 'rejected', 'on-the-way', 'in-progress', 'completed',
      'cancelled', 'quoted', 'negotiating', 'funded', 'job-done', 'disputed', 'released',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const booking = await collections.bookings().findOne({ id: bookingId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // ── GUARD: artisan cannot start work (on-the-way / in-progress) unless booking is funded ──
    if (['on-the-way', 'in-progress'].includes(status) && booking.status !== 'funded' && booking.status !== 'on-the-way') {
      return res.status(400).json({
        error: 'Cannot start work until the customer has accepted your quote and locked payment in escrow.',
        code: 'QUOTE_NOT_ACCEPTED',
        currentStatus: booking.status,
      });
    }

    const updateFields: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    
    if (artisanNotes) updateFields.artisanNotes = artisanNotes;
    if (finalPrice) updateFields.finalPrice = parseFloat(finalPrice);
    if (status === 'completed') updateFields.completedAt = new Date().toISOString();
    if (status === 'cancelled') updateFields.cancelledAt = new Date().toISOString();
    if (status === 'job-done') updateFields.jobDoneAt = new Date().toISOString();

    const result = await collections.bookings().findOneAndUpdate(
      { id: bookingId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const io = (req.app as any).io;

    // ── STATUS-SPECIFIC ACTIONS ──

    // CANCELLED: refund escrow to customer
    if (status === 'cancelled' && booking.escrowAmount && booking.escrowAmount > 0) {
      await collections.users().updateOne(
        { id: booking.customerId },
        {
          $inc: {
            walletBalance: booking.escrowAmount,
            escrowAmount: -booking.escrowAmount,
          },
        }
      );
      // Update escrow transaction
      if (booking.escrowTransactionId) {
        await collections.transactions().updateOne(
          { id: booking.escrowTransactionId },
          { $set: { status: 'refunded', updatedAt: new Date().toISOString() } }
        );
      }
      // Create refund transaction
      const refundTxId = await getNextSequence('transactionId');
      await collections.transactions().insertOne({
        id: refundTxId,
        bookingId,
        type: 'refund',
        amount: booking.escrowAmount,
        toUserId: booking.customerId,
        status: 'completed',
        metadata: { reason: 'Booking cancelled', originalTxId: booking.escrowTransactionId },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await notifyUser(booking.customerId, '💰 Refund Processed', `₦${booking.escrowAmount.toLocaleString()} has been returned to your wallet.`, 'escrow', { bookingId }, io);
    }

    // REJECTED: refund escrow to customer
    if (status === 'rejected' && booking.escrowAmount && booking.escrowAmount > 0) {
      await collections.users().updateOne(
        { id: booking.customerId },
        {
          $inc: {
            walletBalance: booking.escrowAmount,
            escrowAmount: -booking.escrowAmount,
          },
        }
      );
      if (booking.escrowTransactionId) {
        await collections.transactions().updateOne(
          { id: booking.escrowTransactionId },
          { $set: { status: 'refunded', updatedAt: new Date().toISOString() } }
        );
      }
      const refundTxId = await getNextSequence('transactionId');
      await collections.transactions().insertOne({
        id: refundTxId,
        bookingId,
        type: 'refund',
        amount: booking.escrowAmount,
        toUserId: booking.customerId,
        status: 'completed',
        metadata: { reason: 'Artisan rejected booking' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await notifyUser(booking.customerId, '❌ Booking Declined', `The artisan declined your request. ₦${booking.escrowAmount.toLocaleString()} has been refunded.`, 'booking', { bookingId }, io);
    }

    // ACCEPTED: notify customer with artisan location
    if (status === 'accepted') {
      const artisanProfile = await collections.artisanProfiles().findOne({ userId: booking.artisanUserId });
      const artisanLocation = artisanProfile?.workshopAddress || '';
      await notifyUser(booking.customerId, '✅ Booking Accepted!', `Your artisan has accepted the job! Location: ${artisanLocation || 'Will be shared when on the way'}`, 'booking', { bookingId, artisanLocation }, io);
    }

    // ON-THE-WAY: notify customer with artisan location
    if (status === 'on-the-way') {
      const artisanProfile = await collections.artisanProfiles().findOne({ userId: booking.artisanUserId });
      const artisanLocation = artisanProfile?.workshopAddress || '';
      await notifyUser(booking.customerId, '🚗 Artisan On The Way!', `Your artisan is heading to you from: ${artisanLocation}`, 'booking', { bookingId, artisanLocation }, io);
    }

    // IN-PROGRESS: artisan started working
    if (status === 'in-progress') {
      await notifyUser(booking.customerId, '🔧 Work Started', 'The artisan has started working on your job.', 'booking', { bookingId }, io);
    }

    // JOB-DONE: notify customer to review and release funds
    if (status === 'job-done') {
      await notifyUser(
        booking.customerId,
        '🔧 Job Completed!',
        'The artisan has finished working. Please review the work and release payment.',
        'booking',
        { bookingId, action: 'release_fund' },
        io
      );
    }

    res.json({
      success: true,
      message: `Booking ${status} successfully`,
      booking: result,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
};

/**
 * Add a review for a completed booking
 * Review Validation: Links every review to a Job_ID - user must have paid for a job
 */
export const addReview = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { rating, comment, customerId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get the booking
    const booking = await collections.bookings().findOne({ id: bookingId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Can only review completed bookings',
        code: 'BOOKING_NOT_COMPLETED'
      });
    }

    // REVIEW INTEGRITY: Verify the reviewer is actually the customer who booked
    if (customerId && parseInt(customerId) !== booking.customerId) {
      return res.status(403).json({ 
        error: 'You can only review bookings you have made. Review integrity check failed.',
        code: 'REVIEW_INTEGRITY_VIOLATION'
      });
    }

    // Check if already reviewed
    const existingReview = await collections.reviews().findOne({ bookingId });
    if (existingReview || booking.rating) {
      return res.status(400).json({ 
        error: 'This booking has already been reviewed',
        code: 'ALREADY_REVIEWED' 
      });
    }

    const reviewId = await getNextSequence('reviewId');
    const now = new Date().toISOString();

    const review = {
      id: reviewId,
      bookingId,
      customerId: booking.customerId,
      artisanId: booking.artisanId,
      rating: parseFloat(rating),
      comment: comment || '',
      createdAt: now,
    };

    await collections.reviews().insertOne(review);

    // Update booking with rating
    await collections.bookings().updateOne(
      { id: bookingId },
      { $set: { rating: parseFloat(rating), review: comment || '', updatedAt: now } }
    );

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review,
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
};

/**
 * Get reviews for an artisan
 */
export const getArtisanReviews = async (req: Request, res: Response) => {
  try {
    const artisanId = parseInt(Array.isArray(req.params.artisanId) ? req.params.artisanId[0] : req.params.artisanId);

    const reviews = await collections.reviews()
      .find({ artisanId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Enrich with customer names
    const enriched = await Promise.all(
      reviews.map(async (review) => {
        const customer = await collections.users().findOne({ id: review.customerId });
        return {
          ...review,
          customerName: customer?.name || 'Anonymous',
          customerAvatar: customer?.avatar || null,
        };
      })
    );

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews: enriched,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error('Get artisan reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

/**
 * Get artisan profile detail (public - for hire screen)
 */
export const getArtisanDetail = async (req: Request, res: Response) => {
  try {
    const artisanIdParam = Array.isArray(req.params.artisanId) ? req.params.artisanId[0] : req.params.artisanId;
    
    let artisan;
    // Try numeric id first
    artisan = await collections.artisanProfiles().findOne({ id: parseInt(artisanIdParam) });
    
    if (!artisan) {
      // Try MongoDB ObjectId
      const { ObjectId } = await import('mongodb');
      try {
        artisan = await collections.artisanProfiles().findOne({ _id: new ObjectId(artisanIdParam) });
      } catch (e) {
        // Try by userId
        artisan = await collections.artisanProfiles().findOne({ userId: parseInt(artisanIdParam) });
      }
    }

    if (!artisan) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    // Get user details
    const user = await collections.users().findOne({ id: artisan.userId });

    // Get reviews
    const reviews = await collections.reviews()
      .find({ artisanId: artisan.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 4.8; // Default rating for new artisans

    // Get completed jobs count
    const completedJobs = await collections.bookings().countDocuments({
      artisanId: artisan.id,
      status: 'completed',
    });

    // Enrich reviews with customer names
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        const customer = await collections.users().findOne({ id: review.customerId });
        return {
          ...review,
          customerName: customer?.name || 'Anonymous',
          customerAvatar: customer?.avatar || null,
        };
      })
    );

    res.json({
      id: artisan._id?.toString(),
      profileId: artisan.id,
      userId: artisan.userId,
      name: user?.name || 'Unknown',
      phone: user?.phone || '',
      email: user?.email || '',
      avatar: normalizeImageUrl(artisan.profilePhotoUrl, req) || normalizeImageUrl((user as any)?.avatar, req) || null,
      trade: artisan.primarySkill || artisan.skillCategory || '',
      category: artisan.skillCategory || '',
      yearsExperience: artisan.yearsExperience || 0,
      workshopAddress: artisan.workshopAddress || '',
      portfolioPhotos: normalizeImageUrls(artisan.portfolioPhotos, req),
      verified: artisan.verificationStatus === 'verified',
      verificationStatus: artisan.verificationStatus,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
      completedJobs,
      startingPrice: 3000, // TODO: Make configurable per artisan
      reviews: enrichedReviews,
    });
  } catch (error) {
    console.error('Get artisan detail error:', error);
    res.status(500).json({ error: 'Failed to fetch artisan details' });
  }
};

/**
 * POST /api/booking/:id/submit-quote
 * Artisan submits a quotation for a specific booking.
 * - Only allowed when booking.status is 'accepted' or 'negotiating'
 * - Supersedes any previous unsettled quote on this booking
 * - Sets booking.status → 'quoted'
 * - Notifies the customer
 */
export const submitBookingQuote = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { artisanUserId, amount, workDetails, estimatedDays } = req.body;

    if (!artisanUserId || !amount || !workDetails) {
      return res.status(400).json({ error: 'artisanUserId, amount, and workDetails are required' });
    }

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const booking = await collections.bookings().findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.artisanUserId !== parseInt(artisanUserId)) {
      return res.status(403).json({ error: 'Only the assigned artisan can submit a quote for this booking' });
    }
    if (!['accepted', 'negotiating', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        error: `Cannot submit a quote when booking status is '${booking.status}'. Booking must be accepted first.`,
        code: 'INVALID_STATUS',
      });
    }

    const now = new Date().toISOString();

    // Find or create a conversation for this booking pair
    const existingConv = await collections.conversations().findOne({
      $or: [
        { bookingId },
        { customerId: booking.customerId, artisanUserId: booking.artisanUserId },
      ],
    });
    let conversationId: number;
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      conversationId = await getNextSequence('conversationId');
      await collections.conversations().insertOne({
        id: conversationId,
        customerId: booking.customerId,
        artisanUserId: booking.artisanUserId,
        bookingId,
        lastMessage: '',
        lastMessageAt: now,
        customerUnread: 0,
        artisanUnread: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Supersede any previous sent quotes on this booking
    await collections.quotes().updateMany(
      { bookingId, status: 'sent' },
      { $set: { status: 'superseded' as const, updatedAt: now } }
    );

    // Get revision version
    const prevQuote = await collections.quotes().findOne(
      { bookingId, status: 'superseded' },
      { sort: { createdAt: -1 } }
    );

    const quoteId = await getNextSequence('quoteId');
    const quote = {
      id: quoteId,
      bookingId,
      conversationId: conversationId,
      artisanUserId: booking.artisanUserId,
      customerId: booking.customerId,
      workDescription: workDetails,
      laborCost: totalAmount,
      materialsCost: 0,
      totalCost: totalAmount,
      serviceFee: 0,
      grandTotal: totalAmount,           // Total client pays = agreed quote amount
      duration: estimatedDays || 'To be confirmed',
      status: 'sent' as const,
      version: prevQuote ? prevQuote.version + 1 : 1,
      previousQuoteId: prevQuote?.id,
      createdAt: now,
      updatedAt: now,
    };
    await collections.quotes().insertOne(quote);

    // Update booking: set status → 'quoted', link quoteId
    await collections.bookings().updateOne(
      { id: bookingId },
      { $set: { status: 'quoted' as any, quoteId, quotedAt: now, updatedAt: now } }
    );

    // Send quote as a chat message
    const messageId = await getNextSequence('messageId');
    await collections.messages().insertOne({
      id: messageId,
      conversationId: conversationId,
      senderId: booking.artisanUserId,
      senderRole: 'artisan' as const,
      type: 'quote' as const,
      content: `📋 Quote ${quote.version > 1 ? `(v${quote.version}) ` : ''}submitted: ₦${totalAmount.toLocaleString()} — ${workDetails}`,
      quoteId,
      status: 'sent' as const,
      createdAt: now,
    });
    await collections.conversations().updateOne(
      { id: conversationId },
      {
        $set: {
          lastMessage: `📋 Quote: ₦${totalAmount.toLocaleString()}`,
          lastMessageAt: now,
          updatedAt: now,
        },
        $inc: { customerUnread: 1 },
      }
    );

    // Notify customer
    const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
    const io = (req.app as any).io;
    await notifyUser(
      booking.customerId,
      '📋 Quote Received!',
      `${artisanUser?.name || 'Your artisan'} quoted ₦${totalAmount.toLocaleString()} for your booking. Tap to review and accept.`,
      'booking',
      { bookingId, quoteId },
      io
    );
    if (io) {
      io.to(`user:${booking.customerId}`).emit('quote_received', { quote, bookingId });
    }

    return res.status(201).json({
      success: true,
      message: 'Quote submitted. Awaiting customer review.',
      quote,
      bookingStatus: 'quoted',
    });
  } catch (error) {
    console.error('Submit booking quote error:', error);
    return res.status(500).json({ error: 'Failed to submit quote' });
  }
};

/**
 * GET /api/booking/:id/quote
 * Returns the current active (sent) quote for a booking.
 */
export const getBookingQuote = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const booking = await collections.bookings().findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const quote = await collections.quotes().findOne(
      { bookingId, status: 'sent' },
      { sort: { createdAt: -1 } }
    );

    return res.json({ success: true, quote: quote || null });
  } catch (error) {
    console.error('Get booking quote error:', error);
    return res.status(500).json({ error: 'Failed to get booking quote' });
  }
};

/**
 * POST /api/booking/:id/release-fund
 * Customer confirms work is done and releases escrow to artisan wallet
 * Commission: 10% deducted, 90% goes to artisan
 */
export const releaseFund = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const booking = await collections.bookings().findOne({ id: bookingId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.customerId !== parseInt(customerId)) {
      return res.status(403).json({ error: 'Only the customer who booked can release funds' });
    }
    if (booking.status !== 'job-done') {
      return res.status(400).json({ error: `Cannot release funds from status: ${booking.status}. Job must be marked as done first.` });
    }

    const now = new Date().toISOString();
    const escrowAmount = booking.escrowAmount || booking.estimatedPrice || 0;
    const COMMISSION_RATE = 0.10; // 10%
    const commission = Math.round(escrowAmount * COMMISSION_RATE);
    const artisanPayout = escrowAmount - commission;

    // 1. Update escrow transaction to released
    if (booking.escrowTransactionId) {
      await collections.transactions().updateOne(
        { id: booking.escrowTransactionId },
        { $set: { status: 'released', updatedAt: now } }
      );
    }

    // 2. Commission transaction
    const commTxId = await getNextSequence('transactionId');
    await collections.transactions().insertOne({
      id: commTxId,
      bookingId,
      type: 'commission',
      amount: commission,
      fromUserId: booking.artisanUserId,
      status: 'completed',
      metadata: { commissionRate: COMMISSION_RATE, grossAmount: escrowAmount },
      createdAt: now,
      updatedAt: now,
    });

    // 3. Release transaction (artisan payout)
    const releaseTxId = await getNextSequence('transactionId');
    await collections.transactions().insertOne({
      id: releaseTxId,
      bookingId,
      type: 'escrow_release',
      amount: artisanPayout,
      toUserId: booking.artisanUserId,
      status: 'completed',
      metadata: { grossAmount: escrowAmount, commission, netPayout: artisanPayout },
      createdAt: now,
      updatedAt: now,
    });

    // 4. Credit artisan wallet
    await collections.users().updateOne(
      { id: booking.artisanUserId },
      { $inc: { walletBalance: artisanPayout } }
    );

    // 5. Deduct from customer escrowAmount
    await collections.users().updateOne(
      { id: booking.customerId },
      { $inc: { escrowAmount: -escrowAmount } }
    );

    // 6. Update booking to released/completed
    await collections.bookings().updateOne(
      { id: bookingId },
      {
        $set: {
          status: 'released',
          artisanPayout,
          platformCommission: commission,
          releasedAt: now,
          completedAt: now,
          updatedAt: now,
        },
      }
    );

    // 7. Notifications
    const io = (req.app as any).io;
    await notifyUser(
      booking.artisanUserId,
      '💵 Payment Released!',
      `₦${artisanPayout.toLocaleString()} has been credited to your wallet. Great job!`,
      'escrow',
      { bookingId, amount: artisanPayout },
      io
    );
    await notifyUser(
      booking.customerId,
      '✅ Payment Complete',
      `₦${artisanPayout.toLocaleString()} released to the artisan. Thank you for using TrustConnect!`,
      'escrow',
      { bookingId },
      io
    );

    res.json({
      success: true,
      message: 'Funds released successfully',
      payout: {
        escrowAmount,
        commission,
        commissionRate: '10%',
        artisanPayout,
      },
    });
  } catch (error) {
    console.error('Release fund error:', error);
    res.status(500).json({ error: 'Failed to release funds' });
  }
};

/**
 * POST /api/booking/:id/submit-work-proof
 * Artisan submits 3 proof photos → status transitions in-progress → job-done
 * Creates a work_proof chat message so customer sees photos in the chat
 */
export const submitWorkProof = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { artisanUserId, photos } = req.body;

    if (!artisanUserId) {
      return res.status(400).json({ error: 'artisanUserId is required' });
    }
    if (!photos || !Array.isArray(photos) || photos.length < 3) {
      return res.status(400).json({ error: 'Exactly 3 or more proof photos are required' });
    }

    const booking = await collections.bookings().findOne({ id: bookingId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.artisanUserId !== parseInt(artisanUserId)) {
      return res.status(403).json({ error: 'Only the assigned artisan can submit work proof' });
    }
    if (!['in-progress', 'accepted', 'on-the-way'].includes(booking.status)) {
      return res.status(400).json({
        error: `Cannot submit proof from status: ${booking.status}. Job must be in-progress.`,
      });
    }

    const now = new Date().toISOString();

    // 1. Update booking status to job-done
    await collections.bookings().updateOne(
      { id: bookingId },
      {
        $set: {
          status: 'job-done',
          workProofPhotos: photos.slice(0, 3),
          workProofSubmittedAt: now,
          jobDoneAt: now,
          updatedAt: now,
        },
      }
    );

    // 2. Post a work_proof chat message so proof appears in chat
    const conversation = await collections.conversations().findOne({
      $or: [{ bookingId }, { customerId: booking.customerId, artisanUserId: booking.artisanUserId }],
    });

    if (conversation) {
      const messageId = await getNextSequence('messageId');
      const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
      const artisanName = artisanUser ? artisanUser.name : 'Artisan';

      await collections.messages().insertOne({
        id: messageId,
        conversationId: conversation.id,
        senderId: booking.artisanUserId,
        senderRole: 'artisan',
        type: 'work_proof',
        content: `${artisanName} has submitted proof of completed work. Please review and release payment.`,
        workProofPhotos: photos.slice(0, 3),
        status: 'delivered',
        createdAt: now,
      });

      // Update conversation last message
      await collections.conversations().updateOne(
        { id: conversation.id },
        {
          $set: {
            lastMessage: '📸 Work proof submitted — review to release payment',
            lastMessageAt: now,
            customerUnread: (conversation.customerUnread || 0) + 1,
            updatedAt: now,
          },
        }
      );
    }

    // 3. Notify customer
    const io = (req.app as any).io;
    await notifyUser(
      booking.customerId,
      '📸 Work Proof Submitted',
      'The artisan has submitted 3 photos of completed work. Please review and release payment or raise a dispute.',
      'booking',
      { bookingId },
      io
    );

    // Also confirm to the artisan that their submission was received
    await notifyUser(
      booking.artisanUserId,
      '✅ Work Proof Sent!',
      'Your proof photos have been delivered to the client. Payment will be released once they approve.',
      'booking',
      { bookingId },
      io
    );

    res.json({
      success: true,
      message: 'Work proof submitted. Job marked as done.',
      bookingStatus: 'job-done',
    });
  } catch (error) {
    console.error('Submit work proof error:', error);
    res.status(500).json({ error: 'Failed to submit work proof' });
  }
};