import express from 'express';
import Character from '../models/Character.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/characters - Get all characters for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const characters = await Character.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ message: 'Server error fetching characters' });
  }
});

// GET /api/characters/:id - Get a specific character
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check if the character belongs to the user
    if (character.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this character' });
    }

    res.status(200).json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ message: 'Server error fetching character' });
  }
});

// POST /api/characters - Create a new character
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, class: characterClass, race, level } = req.body;

    // Validation
    if (!name || !characterClass || !race) {
      return res.status(400).json({
        message: 'Name, class, and race are required',
        errors: {
          name: !name ? 'Name is required' : undefined,
          class: !characterClass ? 'Class is required' : undefined,
          race: !race ? 'Race is required' : undefined,
        },
      });
    }

    const character = await Character.create({
      name,
      class: characterClass,
      race,
      level: level || 1,
      userId: req.userId,
    });

    res.status(201).json({
      message: 'Character created successfully',
      character,
    });
  } catch (error) {
    console.error('Character creation error:', error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    res.status(500).json({ message: 'Server error creating character' });
  }
});

// PUT /api/characters/:id - Update a character
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check if the character belongs to the user
    if (character.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this character' });
    }

    const { name, class: characterClass, race, level } = req.body;

    if (name) character.name = name;
    if (characterClass) character.class = characterClass;
    if (race) character.race = race;
    if (level) character.level = level;

    await character.save();

    res.status(200).json({
      message: 'Character updated successfully',
      character,
    });
  } catch (error) {
    console.error('Character update error:', error);
    res.status(500).json({ message: 'Server error updating character' });
  }
});

// DELETE /api/characters/:id - Delete a character
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check if the character belongs to the user
    if (character.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this character' });
    }

    await Character.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Character deletion error:', error);
    res.status(500).json({ message: 'Server error deleting character' });
  }
});

export default router;
