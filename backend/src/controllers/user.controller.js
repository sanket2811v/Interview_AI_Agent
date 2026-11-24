import db from '../config/prisma.js';
import { updateProfileSchema } from '../validators/auth.validator.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        timestamp: new Date().toISOString()
      });
    }

    const { password, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      data: {
        user: safeUser,
        profile: user.profile
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    // Upsert or update UserProfile strictly scoped to authenticated req.user.id
    const updatedProfile = await db.userProfile.upsert({
      where: { userId: req.user.id },
      update: {
        ...validatedData,
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        ...validatedData
      }
    });

    // Optionally update user's display name if fullName provided
    if (validatedData.fullName) {
      await db.user.update({
        where: { id: req.user.id },
        data: { name: validatedData.fullName }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        profile: updatedProfile
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const issues = err.errors || err.issues || [];
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues.map((e) => ({ field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''), message: e.message })),
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export default {
  getProfile,
  updateProfile
};

