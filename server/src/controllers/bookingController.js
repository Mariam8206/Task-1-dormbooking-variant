import Joi from 'joi';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';

// --- SECTION 2: VALIDATION SCHEMAS ---
const createBookingSchema = Joi.object({
  roomNumber: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().greater(Joi.ref('startDate')),
  purpose: Joi.string().allow('').optional(),
  bookedBy: Joi.string().optional(),
});

const updateBookingSchema = Joi.object({
  roomNumber: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  purpose: Joi.string().allow('').optional(),
  bookedBy: Joi.string().optional(),
}).min(1).custom((value, helpers) => {
  // If both dates are provided in the update, validate them
  if (value.startDate && value.endDate) {
    if (new Date(value.startDate) >= new Date(value.endDate)) {
 return helpers.message('endDate must be strictly after startDate');    }
  }
  return value;
});

// --- SECTION 4: CONFLICT DETECTION HELPER ---
async function checkConflict(roomNumber, startDate, endDate, excludeId = null) {
  const query = {
    roomNumber,
    startDate: { $lt: new Date(endDate) },
    endDate: { $gt: new Date(startDate) },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return await Booking.findOne(query);
}

// --- SECTION 3 & 5: CRUD CONTROLLERS ---

// GET /api/bookings
export async function getAllBookings(req, res, next) {
  try {
    // Section 5: Populate the bookedBy field with name and email
    const bookings = await Booking.find({}).populate('bookedBy', 'name email');
    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/:id
export async function getBooking(req, res, next) {
  try {
    // Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    // Section 5: Populate
    const booking = await Booking.findById(req.params.id).populate('bookedBy', 'name email');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json(booking);
  } catch (err) {
    next(err);
  }
}

// POST /api/bookings
export async function createBooking(req, res, next) {
  try {
    // 1. Section 2: Validate input
    const { error, value } = createBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // 2. Section 4: Check for conflicts
    const conflict = await checkConflict(value.roomNumber, value.startDate, value.endDate);
    if (conflict) {
      return res.status(409).json({ error: 'This room is already booked for the requested dates.' });
    }

    // 3. Create and save
    const newBooking = new Booking(value);
    await newBooking.save();

    res.status(201).json(newBooking);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id
export async function updateBooking(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    // 1. Section 2: Validate input
    const { error, value } = updateBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // 2. Fetch the existing booking
    const existingBooking = await Booking.findById(req.params.id);
    if (!existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // 3. Section 4: Determine the final values (merge old with new)
    const finalRoom = value.roomNumber || existingBooking.roomNumber;
    const finalStart = value.startDate || existingBooking.startDate;
    const finalEnd = value.endDate || existingBooking.endDate;

    // 4. Section 4: Check conflict (passing req.params.id to exclude self)
    const conflict = await checkConflict(finalRoom, finalStart, finalEnd, req.params.id);
    if (conflict) {
      return res.status(409).json({ error: 'Update would cause a conflict with an existing booking.' });
    }

    // 5. Apply updates and save
    Object.assign(existingBooking, value);
    await existingBooking.save();

    res.status(200).json(existingBooking);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/bookings/:id
export async function deleteBooking(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    if (!deletedBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(204).send(); // 204 = No Content, standard for successful DELETE
  } catch (err) {
    next(err);
  }
}