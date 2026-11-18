// controllers/lists.js - allowed values, the same as the ENUMs in sql/01_schema.sql
module.exports = {
  CATEGORIES: ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'mask'],
  SKIN_TYPES: ['dry', 'oily', 'combination', 'sensitive', 'normal'],
  SKIN_TONES: ['fair', 'light', 'medium', 'tan', 'deep'],
  AGE_GROUPS: ['under18', '18-24', '25-34', '35-44', '45plus'],
  GENDERS: ['female', 'male', 'other'],
  GENDER_TARGETS: ['female', 'male', 'unisex'],
  TEXTURES: ['gel', 'lotion', 'cream', 'balm'],
  FINISHES: ['matte', 'natural', 'dewy'],
  PA_RATINGS: ['PA+', 'PA++', 'PA+++', 'PA++++'],
  FILTER_TYPES: ['chemical', 'physical', 'hybrid']
};
