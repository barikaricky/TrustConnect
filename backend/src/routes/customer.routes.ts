import { Router } from 'express';
import { 
  getCustomerProfile, 
  updateCustomerProfile,
  getWalletBalance,
  getActiveJobs,
  getFavoriteArtisans,
  uploadProfilePicture
} from '../controllers/customer.controller';

const router = Router();

// Customer profile routes
router.get('/:customerId/profile', getCustomerProfile);
router.put('/:customerId/profile', updateCustomerProfile);
router.post('/:customerId/profile/picture', uploadProfilePicture);

// Customer wallet routes
router.get('/:customerId/wallet/balance', getWalletBalance);

// Customer job routes
router.get('/:customerId/jobs/active', getActiveJobs);

// Customer favorites
router.get('/:customerId/favorites', getFavoriteArtisans);

export default router;
