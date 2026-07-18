/**
 * Catalog seed data — categories, subcategories, products and supplier brands.
 *
 * Prices are in Kenyan Shillings (KES). Each product carries a wholesale buying
 * price and a retail selling price; wholesale/dealer prices are derived from
 * these in the seeder. `brand` (when set) links the product to a supplier of the
 * same name so purchase orders can be raised against the right vendor.
 */

export interface ProductSeed {
  name: string;
  /** Supplier/brand name; matched against the SUPPLIERS list. */
  brand?: string;
  /** Wholesale cost we pay, in KES. */
  buyingPrice: number;
  /** Retail price we sell at, in KES. */
  sellingPrice: number;
}

export interface CategorySeed {
  name: string;
  children?: CategorySeed[];
  products?: ProductSeed[];
}

/** Distinct supplier brands seeded into the `suppliers` table. */
export const SUPPLIERS = [
  'TP-Link',
  'Tenda',
  'Mercusys',
  'Netis',
  'Huawei',
  'Hikvision',
  'Dahua',
  'EZVIZ',
  'Xiaomi',
  'Amazon',
  'Logitech',
  'HP',
  'Dell',
  'Lenovo',
  'Giganet',
  'Taisia',
  'ADL',
  'AMP',
  'CP',
  'Mikrotik',
  'LG',
  'Samsung',
  'Bosch',
  'Hisense',
  'Dr. Beckmann',
  'Finish',
] as const;

export const CATALOG: CategorySeed[] = [
  {
    name: 'Network Cables',
    children: [
      {
        name: 'CAT6 Cables',
        products: [
          { name: 'Giganet CAT6 Indoor 305M', brand: 'Giganet', buyingPrice: 6500, sellingPrice: 8500 },
          { name: 'Giganet CAT6 Outdoor 305M', brand: 'Giganet', buyingPrice: 8500, sellingPrice: 11000 },
          { name: 'Taisia CAT6 Indoor 305M', brand: 'Taisia', buyingPrice: 4500, sellingPrice: 6000 },
          { name: 'Taisia CAT6 Outdoor 305M', brand: 'Taisia', buyingPrice: 6000, sellingPrice: 8000 },
          { name: 'ADL CAT6 Indoor 305M', brand: 'ADL', buyingPrice: 3500, sellingPrice: 5000 },
          { name: 'ADL CAT6 Outdoor 305M', brand: 'ADL', buyingPrice: 5000, sellingPrice: 6500 },
          { name: 'AMP CAT6 Indoor 305M', brand: 'AMP', buyingPrice: 9000, sellingPrice: 12000 },
          { name: 'AMP CAT6 Outdoor 305M', brand: 'AMP', buyingPrice: 11000, sellingPrice: 14000 },
          { name: 'CP CAT6 Indoor 305M', brand: 'CP', buyingPrice: 4000, sellingPrice: 5500 },
          { name: 'CP CAT6 Outdoor 305M', brand: 'CP', buyingPrice: 5500, sellingPrice: 7000 },
        ],
      },
      {
        name: 'CAT5e Cables',
        products: [
          { name: 'Giganet CAT5e Indoor 305M', brand: 'Giganet', buyingPrice: 4500, sellingPrice: 6000 },
          { name: 'Giganet CAT5e Outdoor 305M', brand: 'Giganet', buyingPrice: 6000, sellingPrice: 8000 },
          { name: 'Taisia CAT5e Indoor 305M', brand: 'Taisia', buyingPrice: 3000, sellingPrice: 4500 },
          { name: 'Taisia CAT5e Outdoor 305M', brand: 'Taisia', buyingPrice: 4500, sellingPrice: 6000 },
        ],
      },
      {
        name: 'Fiber Cables',
        products: [
          { name: 'Fiber Drop Cable 1KM Indoor', buyingPrice: 7000, sellingPrice: 9500 },
          { name: 'Fiber Drop Cable 1KM Outdoor', buyingPrice: 8500, sellingPrice: 11000 },
          { name: 'Fiber Drop Cable 2KM Indoor', buyingPrice: 13000, sellingPrice: 17000 },
          { name: 'Fiber Drop Cable 2KM Outdoor', buyingPrice: 16000, sellingPrice: 20000 },
          { name: 'Single Mode Fiber Cable', buyingPrice: 9000, sellingPrice: 12000 },
          { name: 'Multi Mode Fiber Cable', buyingPrice: 10000, sellingPrice: 13500 },
          { name: 'Fiber Drop Cable 5KM', buyingPrice: 22000, sellingPrice: 28000 },
        ],
      },
    ],
  },
  {
    name: 'Routers',
    children: [
      {
        name: 'TP-Link',
        products: [
          { name: 'TP-Link TL-WR840N', brand: 'TP-Link', buyingPrice: 1500, sellingPrice: 2200 },
          { name: 'TP-Link Archer C20', brand: 'TP-Link', buyingPrice: 2500, sellingPrice: 3500 },
          { name: 'TP-Link Archer C54', brand: 'TP-Link', buyingPrice: 2800, sellingPrice: 3900 },
          { name: 'TP-Link Archer C64', brand: 'TP-Link', buyingPrice: 4500, sellingPrice: 6000 },
          { name: 'TP-Link Archer AX10', brand: 'TP-Link', buyingPrice: 6500, sellingPrice: 8500 },
          { name: 'TP-Link Archer AX23', brand: 'TP-Link', buyingPrice: 8500, sellingPrice: 11000 },
        ],
      },
      {
        name: 'Tenda',
        products: [
          { name: 'Tenda F3', brand: 'Tenda', buyingPrice: 1300, sellingPrice: 1900 },
          { name: 'Tenda F6', brand: 'Tenda', buyingPrice: 1500, sellingPrice: 2100 },
          { name: 'Tenda AC5', brand: 'Tenda', buyingPrice: 2200, sellingPrice: 3000 },
          { name: 'Tenda AC8', brand: 'Tenda', buyingPrice: 3000, sellingPrice: 4200 },
          { name: 'Tenda AC10', brand: 'Tenda', buyingPrice: 3200, sellingPrice: 4500 },
        ],
      },
      {
        name: 'Mercusys',
        products: [
          { name: 'Mercusys MW305R', brand: 'Mercusys', buyingPrice: 1200, sellingPrice: 1800 },
          { name: 'Mercusys AC10', brand: 'Mercusys', buyingPrice: 2500, sellingPrice: 3400 },
          { name: 'Mercusys AC12', brand: 'Mercusys', buyingPrice: 3000, sellingPrice: 4000 },
        ],
      },
      {
        name: 'Netis',
        products: [
          { name: 'Netis WF2409E', brand: 'Netis', buyingPrice: 1400, sellingPrice: 2000 },
          { name: 'Netis WF2780', brand: 'Netis', buyingPrice: 2600, sellingPrice: 3600 },
        ],
      },
      {
        name: 'XPON Routers',
        products: [
          { name: 'Generic XPON Router', buyingPrice: 2500, sellingPrice: 3800 },
        ],
      },
    ],
  },
  {
    name: 'Fiber Equipment',
    products: [
      { name: 'Huawei XPON', brand: 'Huawei', buyingPrice: 3500, sellingPrice: 5000 },
      { name: 'Huawei HG8546M', brand: 'Huawei', buyingPrice: 3000, sellingPrice: 4300 },
      { name: 'Huawei HG8245H', brand: 'Huawei', buyingPrice: 3200, sellingPrice: 4500 },
      { name: 'Huawei HG8245Q2', brand: 'Huawei', buyingPrice: 4000, sellingPrice: 5500 },
      { name: 'Huawei GPON', brand: 'Huawei', buyingPrice: 3500, sellingPrice: 5000 },
      { name: 'Huawei HG8145V5', brand: 'Huawei', buyingPrice: 3800, sellingPrice: 5200 },
      { name: 'Huawei HG8245H5', brand: 'Huawei', buyingPrice: 4200, sellingPrice: 5800 },
      { name: 'Huawei EchoLife EG8145V5', brand: 'Huawei', buyingPrice: 4500, sellingPrice: 6000 },
    ],
    children: [
      {
        name: 'Splitters',
        products: [
          { name: '1x2 Fiber Splitter', buyingPrice: 400, sellingPrice: 800 },
          { name: '1x4 Fiber Splitter', buyingPrice: 700, sellingPrice: 1300 },
          { name: '1x8 Fiber Splitter', buyingPrice: 1200, sellingPrice: 2000 },
          { name: '1x16 Fiber Splitter', buyingPrice: 2200, sellingPrice: 3500 },
        ],
      },
      {
        name: 'Fiber Patch Cords',
        products: [
          { name: '1M Fiber Patch Cord', buyingPrice: 150, sellingPrice: 350 },
          { name: '2M Fiber Patch Cord', buyingPrice: 200, sellingPrice: 450 },
          { name: '3M Fiber Patch Cord', buyingPrice: 250, sellingPrice: 550 },
          { name: '5M Fiber Patch Cord', buyingPrice: 350, sellingPrice: 700 },
        ],
      },
      {
        name: 'Media Converters',
        products: [
          { name: '100Mbps Media Converter', buyingPrice: 1200, sellingPrice: 2000 },
          { name: '1000Mbps Media Converter', buyingPrice: 1800, sellingPrice: 2800 },
        ],
      },
      {
        name: 'Fiber Accessories',
        products: [
          { name: 'Fiber Closure', buyingPrice: 1500, sellingPrice: 2500 },
          { name: 'Fiber Tray', buyingPrice: 300, sellingPrice: 600 },
          { name: 'Fiber Joint Box', buyingPrice: 1200, sellingPrice: 2000 },
          { name: 'Fiber Distribution Box (FDB)', buyingPrice: 2000, sellingPrice: 3200 },
          { name: 'Fiber Access Terminal (FAT)', buyingPrice: 2500, sellingPrice: 4000 },
        ],
      },
    ],
  },
  {
    name: 'PoE Equipment',
    children: [
      {
        name: 'PoE Devices',
        products: [
          { name: 'PoE Adapter', buyingPrice: 500, sellingPrice: 900 },
          { name: 'PoE Extender', buyingPrice: 900, sellingPrice: 1600 },
        ],
      },
    ],
  },
  {
    name: 'Network Switches',
    children: [
      {
        name: 'TP-Link',
        products: [
          { name: 'TP-Link 5-Port Switch', brand: 'TP-Link', buyingPrice: 900, sellingPrice: 1400 },
          { name: 'TP-Link 8-Port Switch', brand: 'TP-Link', buyingPrice: 1400, sellingPrice: 2000 },
          { name: 'TP-Link 16-Port Switch', brand: 'TP-Link', buyingPrice: 3500, sellingPrice: 4800 },
          { name: 'TP-Link 24-Port Switch', brand: 'TP-Link', buyingPrice: 6000, sellingPrice: 8000 },
        ],
      },
      {
        name: 'Tenda',
        products: [
          { name: 'Tenda 5-Port Switch', brand: 'Tenda', buyingPrice: 800, sellingPrice: 1200 },
          { name: 'Tenda 8-Port Switch', brand: 'Tenda', buyingPrice: 1200, sellingPrice: 1800 },
        ],
      },
      {
        name: 'Netis',
        products: [
          { name: 'Netis 5-Port Switch', brand: 'Netis', buyingPrice: 850, sellingPrice: 1300 },
          { name: 'Netis 8-Port Switch', brand: 'Netis', buyingPrice: 1250, sellingPrice: 1850 },
        ],
      },
      {
        name: 'PoE Switches',
        products: [
          { name: '4-Port PoE Switch', buyingPrice: 3500, sellingPrice: 5000 },
          { name: '8-Port PoE Switch', buyingPrice: 5500, sellingPrice: 7500 },
          { name: '16-Port PoE Switch', buyingPrice: 11000, sellingPrice: 14000 },
          { name: '24-Port PoE Switch', buyingPrice: 16000, sellingPrice: 20000 },
        ],
      },
      {
        name: 'PoE Accessories',
        products: [
          { name: 'PoE Injector', buyingPrice: 800, sellingPrice: 1300 },
          { name: 'PoE Splitter', buyingPrice: 700, sellingPrice: 1200 },
          { name: '24V PoE Adapter', buyingPrice: 500, sellingPrice: 900 },
          { name: '48V PoE Adapter', buyingPrice: 600, sellingPrice: 1000 },
        ],
      },
    ],
  },
  {
    name: 'Network Accessories',
    children: [
      {
        name: 'RJ45 Connectors',
        products: [
          { name: 'CAT5 RJ45 Connector', buyingPrice: 300, sellingPrice: 600 },
          { name: 'CAT6 RJ45 Connector', buyingPrice: 500, sellingPrice: 900 },
          { name: 'Shielded RJ45 Connector', buyingPrice: 800, sellingPrice: 1300 },
        ],
      },
      {
        name: 'Joiners',
        products: [
          { name: 'RJ45 Joiner', buyingPrice: 100, sellingPrice: 250 },
          { name: 'CAT6 Joiner', buyingPrice: 150, sellingPrice: 300 },
        ],
      },
      {
        name: 'Faceplates',
        products: [
          { name: 'Single Face Plate', buyingPrice: 80, sellingPrice: 200 },
          { name: 'Double Face Plate', buyingPrice: 120, sellingPrice: 300 },
        ],
      },
      {
        name: 'Keystone Jacks',
        products: [
          { name: 'CAT5 Keystone', buyingPrice: 100, sellingPrice: 250 },
          { name: 'CAT6 Keystone', buyingPrice: 150, sellingPrice: 350 },
        ],
      },
      {
        name: 'Patch Panels',
        products: [
          { name: '12 Port Patch Panel', buyingPrice: 1500, sellingPrice: 2200 },
          { name: '24 Port Patch Panel', buyingPrice: 2500, sellingPrice: 3500 },
        ],
      },
      {
        name: 'Cable Management',
        products: [
          { name: 'Cable Clips', buyingPrice: 50, sellingPrice: 150 },
          { name: 'Cable Ties', buyingPrice: 80, sellingPrice: 200 },
          { name: 'Trunking', buyingPrice: 250, sellingPrice: 500 },
          { name: 'Cable Tapes', buyingPrice: 60, sellingPrice: 150 },
        ],
      },
      {
        name: 'Network Boxes',
        products: [
          { name: 'Adapter Box', buyingPrice: 60, sellingPrice: 150 },
          { name: 'Surface Mount Box', buyingPrice: 80, sellingPrice: 200 },
        ],
      },
    ],
  },
  {
    name: 'Networking Tools',
    products: [
      { name: 'RJ45 Crimping Tool', buyingPrice: 700, sellingPrice: 1200 },
      { name: 'Cable Tester', buyingPrice: 500, sellingPrice: 1000 },
      { name: 'Punch Down Tool', buyingPrice: 400, sellingPrice: 800 },
      { name: 'Wire Stripper', buyingPrice: 300, sellingPrice: 600 },
      { name: 'Cable Cutter', buyingPrice: 350, sellingPrice: 700 },
      { name: 'Tone Generator', buyingPrice: 1500, sellingPrice: 2500 },
      { name: 'Fiber Cleaver', buyingPrice: 6000, sellingPrice: 9000 },
      { name: 'Fiber Stripper', buyingPrice: 800, sellingPrice: 1500 },
      { name: 'Fusion Splicer', buyingPrice: 45000, sellingPrice: 60000 },
      { name: 'VFL Tester', buyingPrice: 800, sellingPrice: 1500 },
      { name: 'Long Nose Plier', buyingPrice: 250, sellingPrice: 550 },
      { name: 'Combination Plier', buyingPrice: 300, sellingPrice: 650 },
    ],
  },
  {
    name: 'Wireless',
    children: [
      {
        name: 'Access Points',
        children: [
          {
            name: 'TP-Link',
            products: [
              { name: 'EAP110', brand: 'TP-Link', buyingPrice: 3500, sellingPrice: 5000 },
              { name: 'EAP225', brand: 'TP-Link', buyingPrice: 6000, sellingPrice: 8000 },
              { name: 'EAP245', brand: 'TP-Link', buyingPrice: 9000, sellingPrice: 12000 },
            ],
          },
          {
            name: 'Tenda',
            products: [
              { name: 'Tenda AP4', brand: 'Tenda', buyingPrice: 2500, sellingPrice: 3500 },
              { name: 'Tenda AP5', brand: 'Tenda', buyingPrice: 3000, sellingPrice: 4200 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Smart TV',
    children: [
      {
        name: 'Android TV Boxes',
        products: [
          { name: 'MXQ Pro', buyingPrice: 2000, sellingPrice: 3000 },
          { name: 'H96 Max', buyingPrice: 3000, sellingPrice: 4200 },
          { name: 'X96 Mini', buyingPrice: 2200, sellingPrice: 3200 },
          { name: 'X96 Max+', buyingPrice: 3500, sellingPrice: 4800 },
          { name: 'Xiaomi Mi Box S', brand: 'Xiaomi', buyingPrice: 5500, sellingPrice: 7500 },
        ],
      },
      {
        name: 'TV Streaming',
        products: [
          { name: 'Amazon Fire TV Stick Lite', brand: 'Amazon', buyingPrice: 3000, sellingPrice: 4200 },
          { name: 'Fire TV Stick 4K', brand: 'Amazon', buyingPrice: 4500, sellingPrice: 6000 },
        ],
      },
      {
        name: 'Accessories',
        products: [
          { name: 'Universal TV Remote', buyingPrice: 300, sellingPrice: 600 },
          { name: 'Android TV Remote', buyingPrice: 400, sellingPrice: 800 },
          { name: 'HDMI Cable 1M', buyingPrice: 150, sellingPrice: 400 },
          { name: 'HDMI Cable 3M', buyingPrice: 250, sellingPrice: 600 },
          { name: 'HDMI Cable 5M', buyingPrice: 400, sellingPrice: 800 },
          { name: 'HDMI Splitter 1x2', buyingPrice: 600, sellingPrice: 1100 },
          { name: 'HDMI Splitter 1x4', buyingPrice: 900, sellingPrice: 1600 },
        ],
      },
    ],
  },
  {
    name: 'Computer Accessories',
    children: [
      {
        name: 'Keyboards',
        products: [
          { name: 'HP Wired Keyboard', brand: 'HP', buyingPrice: 600, sellingPrice: 1000 },
          { name: 'Dell Wired Keyboard', brand: 'Dell', buyingPrice: 650, sellingPrice: 1100 },
          { name: 'Logitech Wired Keyboard', brand: 'Logitech', buyingPrice: 800, sellingPrice: 1300 },
          { name: 'Logitech Wireless Keyboard', brand: 'Logitech', buyingPrice: 1500, sellingPrice: 2200 },
        ],
      },
      {
        name: 'Mouse',
        products: [
          { name: 'HP Wired Mouse', brand: 'HP', buyingPrice: 350, sellingPrice: 700 },
          { name: 'Logitech Wired Mouse', brand: 'Logitech', buyingPrice: 500, sellingPrice: 900 },
          { name: 'Logitech Wireless Mouse', brand: 'Logitech', buyingPrice: 1000, sellingPrice: 1600 },
          { name: 'Rechargeable Wireless Mouse', buyingPrice: 900, sellingPrice: 1500 },
        ],
      },
      {
        name: 'Monitors',
        products: [
          { name: '19" Monitor', buyingPrice: 6000, sellingPrice: 8500 },
          { name: '22" Monitor', buyingPrice: 8000, sellingPrice: 11000 },
          { name: '24" Monitor', buyingPrice: 10000, sellingPrice: 13500 },
          { name: '27" Monitor', buyingPrice: 15000, sellingPrice: 19000 },
        ],
      },
      {
        name: 'Desktop Accessories',
        products: [
          { name: 'USB Hub', buyingPrice: 400, sellingPrice: 800 },
          { name: 'Laptop Cooling Pad', buyingPrice: 900, sellingPrice: 1500 },
          { name: 'Mouse Pad', buyingPrice: 100, sellingPrice: 300 },
          { name: 'Webcam', buyingPrice: 1500, sellingPrice: 2500 },
        ],
      },
    ],
  },
  {
    name: 'Batteries',
    products: [
      { name: 'AA Rechargeable Battery', buyingPrice: 250, sellingPrice: 500 },
      { name: 'AAA Rechargeable Battery', buyingPrice: 250, sellingPrice: 500 },
      { name: 'AA Alkaline Battery', buyingPrice: 50, sellingPrice: 150 },
      { name: 'AAA Alkaline Battery', buyingPrice: 50, sellingPrice: 150 },
      { name: '9V Battery', buyingPrice: 120, sellingPrice: 300 },
      { name: 'CR2032 Battery', buyingPrice: 60, sellingPrice: 200 },
    ],
  },
  {
    name: 'Storage',
    children: [
      {
        name: 'Hard Drives',
        products: [
          { name: '500GB HDD', buyingPrice: 3000, sellingPrice: 4200 },
          { name: '1TB HDD', buyingPrice: 4500, sellingPrice: 6000 },
          { name: '2TB HDD', buyingPrice: 7000, sellingPrice: 9000 },
          { name: '4TB HDD', buyingPrice: 11000, sellingPrice: 14000 },
        ],
      },
      {
        name: 'SSD',
        products: [
          { name: '240GB SSD', buyingPrice: 2800, sellingPrice: 4000 },
          { name: '256GB SSD', buyingPrice: 3000, sellingPrice: 4200 },
          { name: '512GB SSD', buyingPrice: 4500, sellingPrice: 6000 },
          { name: '1TB SSD', buyingPrice: 8000, sellingPrice: 10500 },
        ],
      },
      {
        name: 'Flash Storage',
        products: [
          { name: '16GB Flash Disk', buyingPrice: 400, sellingPrice: 700 },
          { name: '32GB Flash Disk', buyingPrice: 550, sellingPrice: 900 },
          { name: '64GB Flash Disk', buyingPrice: 800, sellingPrice: 1300 },
          { name: '128GB Flash Disk', buyingPrice: 1400, sellingPrice: 2100 },
        ],
      },
      {
        name: 'Memory Cards',
        products: [
          { name: '16GB MicroSD', buyingPrice: 400, sellingPrice: 700 },
          { name: '32GB MicroSD', buyingPrice: 550, sellingPrice: 900 },
          { name: '64GB MicroSD', buyingPrice: 900, sellingPrice: 1400 },
          { name: '128GB MicroSD', buyingPrice: 1600, sellingPrice: 2400 },
        ],
      },
    ],
  },
  {
    name: 'Power',
    children: [
      {
        name: 'Adapters',
        products: [
          { name: '5V 2A Adapter', buyingPrice: 250, sellingPrice: 500 },
          { name: '9V 2A Adapter', buyingPrice: 300, sellingPrice: 600 },
          { name: '12V 2A Adapter', buyingPrice: 350, sellingPrice: 700 },
          { name: '12V 5A Adapter', buyingPrice: 600, sellingPrice: 1100 },
          { name: 'Laptop Charger HP', brand: 'HP', buyingPrice: 1500, sellingPrice: 2500 },
          { name: 'Laptop Charger Dell', brand: 'Dell', buyingPrice: 1600, sellingPrice: 2600 },
          { name: 'Laptop Charger Lenovo', brand: 'Lenovo', buyingPrice: 1500, sellingPrice: 2500 },
        ],
      },
      {
        name: 'Extension Cables',
        products: [
          { name: '4 Way Extension', buyingPrice: 500, sellingPrice: 900 },
          { name: '6 Way Extension', buyingPrice: 700, sellingPrice: 1200 },
          { name: 'Surge Protector', buyingPrice: 900, sellingPrice: 1500 },
        ],
      },
      {
        name: 'Voltage Guards',
        products: [
          { name: 'TV Guard', buyingPrice: 400, sellingPrice: 800 },
          { name: 'Fridge Guard', buyingPrice: 500, sellingPrice: 1000 },
          { name: 'Freezer Guard', buyingPrice: 550, sellingPrice: 1100 },
          { name: 'Power Guard', buyingPrice: 450, sellingPrice: 900 },
        ],
      },
      {
        name: 'UPS',
        products: [
          { name: '650VA UPS', buyingPrice: 3500, sellingPrice: 5000 },
          { name: '850VA UPS', buyingPrice: 4500, sellingPrice: 6500 },
          { name: '1000VA UPS', buyingPrice: 6000, sellingPrice: 8500 },
          { name: '1500VA UPS', buyingPrice: 9000, sellingPrice: 12000 },
        ],
      },
      {
        name: 'PDU',
        products: [
          { name: '6 Way PDU', buyingPrice: 2000, sellingPrice: 3000 },
          { name: '8 Way PDU', buyingPrice: 2800, sellingPrice: 4000 },
        ],
      },
    ],
  },
  {
    name: 'CCTV',
    children: [
      {
        name: 'Hikvision',
        products: [
          { name: 'Hikvision 8-Port PoE Switch', brand: 'Hikvision', buyingPrice: 5500, sellingPrice: 7500 },
        ],
      },
      {
        name: 'Hikvision Cameras',
        products: [
          { name: 'Hikvision 2MP Bullet Camera', brand: 'Hikvision', buyingPrice: 2000, sellingPrice: 3000 },
          { name: 'Hikvision 5MP Bullet Camera', brand: 'Hikvision', buyingPrice: 3000, sellingPrice: 4300 },
          { name: 'Hikvision 2MP Dome Camera', brand: 'Hikvision', buyingPrice: 2000, sellingPrice: 3000 },
          { name: 'Hikvision 5MP Dome Camera', brand: 'Hikvision', buyingPrice: 3000, sellingPrice: 4300 },
          { name: 'Hikvision ColorVu Camera', brand: 'Hikvision', buyingPrice: 5000, sellingPrice: 7000 },
        ],
      },
      {
        name: 'Dahua Cameras',
        products: [
          { name: 'Dahua 2MP Bullet Camera', brand: 'Dahua', buyingPrice: 1800, sellingPrice: 2800 },
          { name: 'Dahua 5MP Bullet Camera', brand: 'Dahua', buyingPrice: 2800, sellingPrice: 4000 },
          { name: 'Dahua Dome Camera', brand: 'Dahua', buyingPrice: 2000, sellingPrice: 3000 },
          { name: 'Dahua IP Camera', brand: 'Dahua', buyingPrice: 4000, sellingPrice: 5800 },
        ],
      },
      {
        name: 'WiFi Cameras',
        products: [
          { name: 'EZVIZ WiFi Camera', brand: 'EZVIZ', buyingPrice: 3500, sellingPrice: 5000 },
          { name: 'Hikvision WiFi Camera', brand: 'Hikvision', buyingPrice: 4000, sellingPrice: 5500 },
          { name: 'Dahua WiFi Camera', brand: 'Dahua', buyingPrice: 3800, sellingPrice: 5300 },
        ],
      },
      {
        name: 'DVR',
        products: [
          { name: '4 Channel DVR', buyingPrice: 3500, sellingPrice: 5000 },
          { name: '8 Channel DVR', buyingPrice: 5000, sellingPrice: 7000 },
          { name: '16 Channel DVR', buyingPrice: 8000, sellingPrice: 11000 },
        ],
      },
      {
        name: 'NVR',
        products: [
          { name: '4 Channel NVR', buyingPrice: 4000, sellingPrice: 5800 },
          { name: '8 Channel NVR', buyingPrice: 6000, sellingPrice: 8500 },
          { name: '16 Channel NVR', buyingPrice: 9500, sellingPrice: 13000 },
        ],
      },
      {
        name: 'CCTV Accessories',
        products: [
          { name: 'CCTV Power Supply 12V 5A', buyingPrice: 600, sellingPrice: 1100 },
          { name: 'CCTV Cable 100M', buyingPrice: 2500, sellingPrice: 3500 },
          { name: 'CCTV Cable 180M', buyingPrice: 4000, sellingPrice: 5500 },
          { name: 'BNC Connector', buyingPrice: 40, sellingPrice: 120 },
          { name: 'DC Power Jack', buyingPrice: 40, sellingPrice: 120 },
          { name: 'Video Balun', buyingPrice: 200, sellingPrice: 450 },
          { name: 'Camera Junction Box', buyingPrice: 150, sellingPrice: 350 },
        ],
      },
    ],
  },
  {
    name: 'Mounting Hardware',
    children: [
      {
        name: 'TV Mounts',
        products: [
          { name: '32" TV Wall Mount', buyingPrice: 500, sellingPrice: 1000 },
          { name: '42" TV Wall Mount', buyingPrice: 700, sellingPrice: 1300 },
          { name: '44" TV Wall Mount', buyingPrice: 800, sellingPrice: 1500 },
          { name: '65" TV Wall Mount', buyingPrice: 1500, sellingPrice: 2500 },
          { name: 'Fixed TV Bracket', buyingPrice: 400, sellingPrice: 800 },
        ],
      },
      {
        name: 'Antenna Equipment',
        products: [
          { name: 'TV Ariel', buyingPrice: 600, sellingPrice: 1200 },
          { name: 'Ariel Cable', buyingPrice: 300, sellingPrice: 600 },
        ],
      },
    ],
  },
  {
    name: 'Installation Materials',
    children: [
      {
        name: 'Fasteners',
        products: [
          { name: 'Steel Nails', buyingPrice: 100, sellingPrice: 250 },
          { name: 'Gypsum Screws', buyingPrice: 150, sellingPrice: 350 },
          { name: 'Wall Plugs', buyingPrice: 80, sellingPrice: 200 },
        ],
      },
      {
        name: 'Safety Equipment',
        products: [
          { name: 'Safety Helmet', buyingPrice: 400, sellingPrice: 800 },
          { name: 'Concrete Climber', buyingPrice: 2500, sellingPrice: 4000 },
          { name: 'Climber Belt', buyingPrice: 1200, sellingPrice: 2200 },
        ],
      },
      {
        name: 'Tension Hardware',
        products: [
          { name: '500PA Tension Clamp', buyingPrice: 80, sellingPrice: 200 },
          { name: '1500PA Tension Clamp', buyingPrice: 120, sellingPrice: 300 },
          { name: '2000PA Tension Clamp', buyingPrice: 150, sellingPrice: 350 },
        ],
      },
    ],
  },
  {
    name: 'Washing Machine Accessories',
    children: [
      {
        name: 'Shock Pads',
        products: [
          { name: 'LG Anti-Vibration Shock Pads', brand: 'LG', buyingPrice: 350, sellingPrice: 700 },
          { name: 'Samsung Shock Absorber Pads', brand: 'Samsung', buyingPrice: 350, sellingPrice: 700 },
          { name: 'Bosch Washing Machine Shock Pads', brand: 'Bosch', buyingPrice: 400, sellingPrice: 800 },
          { name: 'Hisense Anti-Slip Shock Pads', brand: 'Hisense', buyingPrice: 300, sellingPrice: 600 },
        ],
      },
      {
        name: 'Inlet Hoses',
        products: [
          { name: 'LG Washing Machine Inlet Hose 2M', brand: 'LG', buyingPrice: 300, sellingPrice: 600 },
          { name: 'Samsung Inlet Hose 1.5M', brand: 'Samsung', buyingPrice: 280, sellingPrice: 550 },
          { name: 'Bosch Reinforced Inlet Hose', brand: 'Bosch', buyingPrice: 400, sellingPrice: 800 },
          { name: 'Generic Universal Inlet Hose', buyingPrice: 200, sellingPrice: 400 },
        ],
      },
      {
        name: 'Outlet Hoses',
        products: [
          { name: 'LG Drain Outlet Hose', brand: 'LG', buyingPrice: 300, sellingPrice: 600 },
          { name: 'Samsung Washing Machine Outlet Hose', brand: 'Samsung', buyingPrice: 300, sellingPrice: 600 },
          { name: 'Bosch Drain Hose 2M', brand: 'Bosch', buyingPrice: 400, sellingPrice: 800 },
          { name: 'Universal Outlet Hose', buyingPrice: 200, sellingPrice: 400 },
        ],
      },
      {
        name: 'Cleaning Products',
        products: [
          { name: 'Dr. Beckmann Washing Machine Cleaner', brand: 'Dr. Beckmann', buyingPrice: 500, sellingPrice: 900 },
          { name: 'Finish Washing Machine Cleaner', brand: 'Finish', buyingPrice: 450, sellingPrice: 850 },
          { name: 'Bosch Deep Cleaner', brand: 'Bosch', buyingPrice: 500, sellingPrice: 950 },
          { name: 'Generic Deep Cleaner Tablets', buyingPrice: 300, sellingPrice: 600 },
        ],
      },
    ],
  },
];
