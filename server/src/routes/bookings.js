import { Router } from 'express';
import {
  getAllBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking
} from '../controllers/bookingController.js';

const router = Router();

router.get('/', getAllBookings);

// 2. GET a specific booking: GET /api/bookings/:id
router.get('/:id', getBooking);

// 3. CREATE a booking: POST /api/bookings
router.post('/', createBooking);

// 4. UPDATE a booking: PATCH /api/bookings/:id
router.patch('/:id', updateBooking);

// 5. DELETE a booking: DELETE /api/bookings/:id
router.delete('/:id', deleteBooking);
export default router;
