-- Per-unit blocking: add unit_index to blocked_dates
-- Per-unit blocking: add unit_index to blocked_dates
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS unit_index INT NOT NULL DEFAULT 1;
ALTER TABLE blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_room_id_date_key;
ALTER TABLE blocked_dates ADD UNIQUE (room_id, date, unit_index);

-- Update existing rooms with tour_url values
UPDATE rooms SET tour_url = 'https://tour.panoee.net/iframe/690596e5eac32b09e73f0ee0' WHERE tour_url = '' AND id = 1;
UPDATE rooms SET tour_url = 'https://tour.panoee.net/iframe/690596e5eac32b09e73f0ee0' WHERE tour_url = '' AND id = 3;
UPDATE rooms SET description = 'Elegant lake-view room with handcrafted Kashmiri furnishings, overlooking the pristine waters of Dal Lake.' WHERE description = '' AND id = 1;
UPDATE rooms SET description = 'Spacious two-bedroom suite ideal for families, with panoramic views of the Himalayan foothills.' WHERE description = '' AND id = 3;
UPDATE rooms SET amenities = '["Lake View","King Bed","Ensuite Bathroom","Heating","Mini Bar","WiFi","Tea/Coffee Maker"]'::jsonb WHERE amenities = '[]'::jsonb AND id = 1;
UPDATE rooms SET amenities = '["Panoramic View","2 Bedrooms","Living Room","Ensuite Bathroom","Heating","Mini Bar","WiFi","Kitchenette"]'::jsonb WHERE amenities = '[]'::jsonb AND id = 3;
