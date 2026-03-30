-- Add new climate values to energy_level enum
ALTER TYPE energy_level ADD VALUE IF NOT EXISTS 'tormenta';
ALTER TYPE energy_level ADD VALUE IF NOT EXISTS 'nublado';
ALTER TYPE energy_level ADD VALUE IF NOT EXISTS 'parcial';
ALTER TYPE energy_level ADD VALUE IF NOT EXISTS 'soleado';
ALTER TYPE energy_level ADD VALUE IF NOT EXISTS 'extraordinario';
ALTER TYPE energy_level ADD VALUE IF NOT EXISTS 'no_aplica';
