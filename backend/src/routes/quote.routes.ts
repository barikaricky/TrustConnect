import { Router } from 'express';
import {
  createQuote,
  getQuote,
  getConversationQuote,
  acceptQuote,
  rejectQuote,
} from '../controllers/quote.controller';

const router = Router();

// Create a new quote (artisan)
router.post('/create', createQuote);

// Get a specific quote
router.get('/:quoteId', getQuote);

// Get the latest active quote in a conversation
router.get('/conversation/:conversationId', getConversationQuote);

// Accept a quote (customer)
router.post('/:quoteId/accept', acceptQuote);

// Reject a quote (customer)
router.post('/:quoteId/reject', rejectQuote);

export default router;
