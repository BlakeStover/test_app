const express = require('express');
const router = express.Router();

const BUILDINGS = [
  'Alumni Hall',
  'Baker Science Center',
  'Campbell Library',
  'Centennial Hall',
  'Commons Dining Hall',
  'East Residence Hall',
  'Engineering Building',
  'Fine Arts Center',
  'Founders Hall',
  'Griffin Student Center',
  'Health & Wellness Center',
  'Humanities Building',
  'Lincoln Hall',
  'North Residence Hall',
  'Oak Hall',
  'Performing Arts Center',
  'Physical Education Complex',
  'Science & Technology Building',
  'South Residence Hall',
  'University Hall',
  'West Residence Hall',
].sort();

// GET /api/buildings
router.get('/', (req, res) => {
  res.json(BUILDINGS);
});

module.exports = router;
