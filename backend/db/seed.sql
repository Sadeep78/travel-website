USE `travel_site`;

INSERT INTO `destinations` (
  `id`, `slug`, `name`, `description`, `price`, `price_amount`, `category`, `region`, `image`, `featured`, `sort_order`, `available_from`, `available_to`
) VALUES
(1, 'sigiriya', 'Sigiriya', 'Ancient rock fortress with majestic views over Sri Lanka’s Cultural Triangle.', '$1,350', 1350.00, 'Cultural', 'Cultural Triangle', 'images/sigiriya.png', 1, 1, '2025-01-01', '2027-12-31'),
(2, 'galle-fort', 'Galle Fort', 'A fortified coastal city lined with colonial architecture and ocean views.', '$1,450', 1450.00, 'Cultural', 'Southern Coast', 'images/galle-fort.png', 1, 2, '2025-01-01', '2027-12-31'),
(3, 'ella', 'Ella', 'Tea country escapes, waterfall hikes, and scenic mountain trails.', '$1,550', 1550.00, 'Scenic', 'Hill Country', 'images/ella.png', 0, 3, '2025-01-01', '2027-12-31'),
(4, 'mirissa', 'Mirissa', 'Beachside relaxation, whale watching, and laid-back southern coast charm.', '$1,250', 1250.00, 'Coastal', 'Southern Coast', 'images/mirissa.png', 1, 4, '2025-11-01', '2027-04-30'),
(5, 'yala', 'Yala National Park', 'Wildlife safaris through one of Sri Lanka’s most famous national parks.', '$1,600', 1600.00, 'Coastal', 'Southeast', 'images/yala.png', 0, 5, '2025-02-01', '2027-10-31'),
(6, 'nuwara-eliya', 'Nuwara Eliya', 'Cool mountain air, tea plantations, and charming colonial estates.', '$1,490', 1490.00, 'Scenic', 'Hill Country', 'images/nuwara-eliya.png', 1, 6, '2025-01-01', '2027-12-31'),
(7, 'kandy', 'Kandy', 'Sacred temples, cultural performances, and lakefront city life.', '$1,520', 1520.00, 'Cultural', 'Central Highlands', 'images/kandy.png', 0, 7, '2025-01-01', '2027-12-31')
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `price` = VALUES(`price`),
  `price_amount` = VALUES(`price_amount`),
  `category` = VALUES(`category`),
  `region` = VALUES(`region`),
  `image` = VALUES(`image`),
  `featured` = VALUES(`featured`),
  `sort_order` = VALUES(`sort_order`),
  `available_from` = VALUES(`available_from`),
  `available_to` = VALUES(`available_to`);
