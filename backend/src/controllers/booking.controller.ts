import { Request, Response } from 'express';
import { collections, getNextSequence } from '../database/connection';

/**
 * Create a new booking / hire request
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
      estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
      customerNotes: customerNotes || '',
      createdAt: now,
      updatedAt: now,
    };

    await collections.bookings().insertOne(booking);

    // Get artisan user details for response
    const artisanUser = await collections.users().findOne({ id: artisanUserId });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        ...booking,
        artisanName: artisanUser?.name || 'Unknown',
        artisanPhone: artisanUser?.phone || '',
        artisanTrade: artisan.primarySkill,
        artisanPhoto: artisan.profilePhotoUrl || null,
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

    // Enrich with artisan details
    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
        const artisanProfile = await collections.artisanProfiles().findOne({ id: booking.artisanId });
        return {
          ...booking,
          artisanName: artisanUser?.name || 'Unknown',
          artisanPhone: artisanUser?.phone || '',
          artisanTrade: artisanProfile?.primarySkill || '',
          artisanPhoto: artisanProfile?.profilePhotoUrl || null,
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
 */
export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { status, artisanNotes, finalPrice } = req.body;

    const validStatuses = ['accepted', 'rejected', 'on-the-way', 'in-progress', 'completed', 'cancelled', 'quoted', 'funded', 'job-done', 'disputed', 'released'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updateFields: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    
    if (artisanNotes) updateFields.artisanNotes = artisanNotes;
    if (finalPrice) updateFields.finalPrice = parseFloat(finalPrice);
    if (status === 'completed') updateFields.completedAt = new Date().toISOString();
    if (status === 'cancelled') updateFields.cancelledAt = new Date().toISOString();

    const result = await collections.bookings().findOneAndUpdate(
      { id: bookingId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Booking not found' });
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
      avatar: artisan.profilePhotoUrl || user?.avatar || null,
      trade: artisan.primarySkill || artisan.skillCategory || '',
      category: artisan.skillCategory || '',
      yearsExperience: artisan.yearsExperience || 0,
      workshopAddress: artisan.workshopAddress || '',
      portfolioPhotos: artisan.portfolioPhotos || [],
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
