import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productsData = [
  { name: 'Samsung Curved Smart Remote', brand: 'Samsung', buyingPrice: 400, sellingPrice: 1200, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Samsung Digital Remote', brand: 'Samsung', buyingPrice: 150, sellingPrice: 500, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'LG Smart Remote', brand: 'LG', buyingPrice: 200, sellingPrice: 600, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'LG Digital Remote', brand: 'LG', buyingPrice: 150, sellingPrice: 500, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Von Smart Remote', brand: 'Von', buyingPrice: 300, sellingPrice: 800, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Royal Digital Remote', brand: 'Royal', buyingPrice: 250, sellingPrice: 600, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Fal 8 (Synix Digital)', brand: 'Synix', buyingPrice: 250, sellingPrice: 600, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Synix Smart Remote', brand: 'Synix', buyingPrice: 300, sellingPrice: 800, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Android Box Remote', brand: 'Generic', buyingPrice: 150, sellingPrice: 400, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'TCL Smart Google Remote', brand: 'Remote', buyingPrice: 350, sellingPrice: 1000, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Snake Light Big (10m)', brand: 'LED Strip', buyingPrice: 440, sellingPrice: 1200, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Snake Light Small (5m)', brand: 'LED Strip', buyingPrice: 250, sellingPrice: 900, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Burner (Primus)', brand: 'Primus', buyingPrice: 100, sellingPrice: 250, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Home Appliances' },
  { name: 'Regulator (6kg)', brand: 'PAC', buyingPrice: 200, sellingPrice: 500, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Tension Hardware' },
  { name: 'Regulator (13kg)', brand: 'PAC', buyingPrice: 250, sellingPrice: 700, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Tension Hardware' },
  { name: 'Gas Pipe', brand: 'Baroli', buyingPrice: 46, sellingPrice: 150, currentStock: 50, minStock: 1, maxStock: 20, categoryPath: 'Tension Hardware' },
  { name: 'Cable Clips 8mm', brand: 'Generic', buyingPrice: 40, sellingPrice: 100, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Fasteners' },
  { name: 'Cable Clips 10mm', brand: 'Generic', buyingPrice: 60, sellingPrice: 100, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Fasteners' },
  { name: 'Cable Clips 14mm', brand: 'Generic', buyingPrice: 90, sellingPrice: 100, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Fasteners' },
  { name: 'Flash Disk 2GB ADU', brand: 'ADU', buyingPrice: 290, sellingPrice: 500, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Flash Disk 4GB ADU', brand: 'ADU', buyingPrice: 320, sellingPrice: 550, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Flash Disk 8GB ADU', brand: 'ADU', buyingPrice: 350, sellingPrice: 600, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Flash Disk 16GB ADU', brand: 'ADU', buyingPrice: 420, sellingPrice: 700, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Flash Disk 32GB ADU', brand: 'ADU', buyingPrice: 550, sellingPrice: 800, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Flash Disk 64GB ADU', brand: 'ADU', buyingPrice: 850, sellingPrice: 800, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Flash Disk 128GB ADU', brand: 'ADU', buyingPrice: 1100, sellingPrice: 1600, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Memory Card 2GB', brand: 'Boost', buyingPrice: 280, sellingPrice: 500, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Memory Card Storage' },
  { name: 'Memory Card 4GB', brand: 'Boost', buyingPrice: 300, sellingPrice: 550, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Memory Card Storage' },
  { name: 'Memory Card 8GB', brand: 'Boost', buyingPrice: 350, sellingPrice: 600, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Memory Card Storage' },
  { name: 'Memory Card 16GB', brand: 'Boost', buyingPrice: 450, sellingPrice: 650, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Memory Card Storage' },
  { name: 'Memory Card 32GB', brand: 'Boost', buyingPrice: 600, sellingPrice: 800, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Memory Card 64GB', brand: 'Boost', buyingPrice: 1000, sellingPrice: 1200, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Flash Storage' },
  { name: 'Samsung Header', brand: 'Samsung', buyingPrice: 70, sellingPrice: 200, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Amazon Header', brand: 'Amazon', buyingPrice: 70, sellingPrice: 200, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Morimaxe Header', brand: 'Morimaxe', buyingPrice: 90, sellingPrice: 200, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Samsung 25w Header', brand: 'Samsung', buyingPrice: 150, sellingPrice: 400, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Samsung 45w Header', brand: 'Samsung', buyingPrice: 200, sellingPrice: 450, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Samsung 45w Header Complete Charger', brand: 'Samsung', buyingPrice: 250, sellingPrice: 600, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Samsung 25W Complete Charger', brand: 'Samsung', buyingPrice: 200, sellingPrice: 500, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Punex Iphone Cable', brand: 'Punex', buyingPrice: 100, sellingPrice: 250, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Punex Type-C Cable', brand: 'Punex', buyingPrice: 100, sellingPrice: 200, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Punex Normal Cable', brand: 'Punex', buyingPrice: 85, sellingPrice: 150, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Oraimo Type-C Cable', brand: 'Oraimo', buyingPrice: 120, sellingPrice: 200, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Oraimo Normal Charger', brand: 'Oraimo', buyingPrice: 200, sellingPrice: 350, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Oraimo Type-C Charger', brand: 'Oraimo', buyingPrice: 220, sellingPrice: 350, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Oraimo Normal Cable', brand: 'Oraimo', buyingPrice: 90, sellingPrice: 180, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Oraimo Copy Earphones', brand: 'Oraimo', buyingPrice: 40, sellingPrice: 150, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Oraimo Neckband G66', brand: 'Oraimo', buyingPrice: 300, sellingPrice: 650, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Oraimo Copy Neckband', brand: 'Oraimo', buyingPrice: 200, sellingPrice: 550, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Oraimo Pods F9', brand: 'Oraimo', buyingPrice: 270, sellingPrice: 600, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'Earpods Coloured', brand: 'Generic', buyingPrice: 200, sellingPrice: 550, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'JBL Earpods', brand: 'JBL', buyingPrice: 300, sellingPrice: 700, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'ABT Pods (OWS-17)', brand: 'ABT', buyingPrice: 450, sellingPrice: 1000, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'HDMI 1.5m', brand: 'HDMI', buyingPrice: 100, sellingPrice: 200, currentStock: 5, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'HDMI 3m', brand: 'HDMI', buyingPrice: 250, sellingPrice: 450, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Mindy Big Padlock (70mm)', brand: 'Mindy', buyingPrice: 700, sellingPrice: 900, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Fasteners' },
  { name: 'Mindy Padlock (60mm)', brand: 'Mindy', buyingPrice: 600, sellingPrice: 850, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Fasteners' },
  { name: 'Phone PIN', brand: 'Generic', buyingPrice: 50, sellingPrice: 70, currentStock: 10, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'C to C Cable', brand: 'Generic', buyingPrice: 50, sellingPrice: 200, currentStock: 6, minStock: 1, maxStock: 20, categoryPath: 'Desktop Accessories' },
  { name: 'PD Charger (36w)', brand: 'PD', buyingPrice: 90, sellingPrice: 250, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Bulb Camera', brand: 'Generic', buyingPrice: 1000, sellingPrice: 1500, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'WiFi Cameras' },
  { name: 'Dahua Camera', brand: 'Dahua', buyingPrice: 1500, sellingPrice: 2200, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Dahua Cameras' },
  { name: '2 Way Audio Amp', brand: 'Generic', buyingPrice: 1500, sellingPrice: 2200, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'CCTV Accessories' },
  { name: 'Smart Lab', brand: 'D8tr', buyingPrice: 3000, sellingPrice: 3500, currentStock: 1, minStock: 1, maxStock: 20, categoryPath: 'Power Adapters' },
  { name: 'Android Box (MXQ 128GB)', brand: 'MXQ', buyingPrice: 2500, sellingPrice: 3200, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Android TV Boxes' },
  { name: 'HDMI Splitter 2 Way', brand: 'HDMI', buyingPrice: 1000, sellingPrice: 1300, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'HDMI Splitter 4 Way', brand: 'HDMI', buyingPrice: 1150, sellingPrice: 1600, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Smart TV Accessories' },
  { name: 'Sonar Decoder', brand: 'Sonar', buyingPrice: 850, sellingPrice: 1500, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'TV Streaming' },
  { name: 'ATB Empty', brand: 'ATB', buyingPrice: 35, sellingPrice: 70, currentStock: 100, minStock: 5, maxStock: 20, categoryPath: 'Fiber Accessories' },
  { name: 'Patch Cord Blue Kubwa 1m', brand: 'Patch', buyingPrice: 90, sellingPrice: 150, currentStock: 90, minStock: 5, maxStock: 20, categoryPath: 'Joiners' },
  { name: 'Patch Cord Blue Ndogo 1m', brand: 'Patch', buyingPrice: 90, sellingPrice: 150, currentStock: 10, minStock: 1, maxStock: 20, categoryPath: 'Joiners' },
  { name: 'P.O.E Adapter', brand: 'Generic', buyingPrice: 300, sellingPrice: 400, currentStock: 3, minStock: 1, maxStock: 20, categoryPath: 'PoE Devices' },
  { name: 'Fiber Splitter 1x8', brand: 'Fibre', buyingPrice: 250, sellingPrice: 350, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Splitters' },
  { name: 'Fiber Splitter 1x4', brand: 'Fibre', buyingPrice: 190, sellingPrice: 300, currentStock: 2, minStock: 1, maxStock: 20, categoryPath: 'Splitters' }
];

let counter = 0;

async function addProducts() {
  let added = 0;
  let failed = 0;

  for (const product of productsData) {
    try {
      counter++;
      // Find or create supplier
      let supplier = await prisma.supplier.findFirst({
        where: { name: product.brand, isDeleted: false }
      });

      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: { 
            name: product.brand, 
            contactName: product.brand,
            email: `${product.brand.toLowerCase()}@supplier.com`,
            phone: '0000000000'
          }
        });
      }

      // Find category
      const category = await prisma.category.findFirst({
        where: { name: product.categoryPath, isDeleted: false }
      });

      if (!category) {
        failed++;
        console.log(`❌ ${product.name}: Category not found`);
        continue;
      }

      // Create product with unique SKU
      const newProduct = await prisma.product.create({
        data: {
          sku: `SKU${Date.now()}-${counter}`,
          name: product.name,
          brand: product.brand,
          categoryId: category.id,
          supplierId: supplier.id,
          buyingPrice: product.buyingPrice,
          sellingPrice: product.sellingPrice,
          wholesalePrice: Math.round(product.sellingPrice * 0.7 * 100) / 100,
          dealerPrice: Math.round(product.sellingPrice * 0.6 * 100) / 100,
          currentStock: product.currentStock,
          minStock: product.minStock,
          maxStock: product.maxStock,
          taxRate: 0
        }
      });

      // Add placeholder image
      await prisma.productImage.create({
        data: {
          productId: newProduct.id,
          imageUrl: '/uploads/placeholder.png',
          isPrimary: true
        }
      });

      added++;
      console.log(`✅ ${added}. ${product.name}`);
    } catch (error) {
      failed++;
      console.log(`❌ ${product.name}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Added: ${added} products`);
  console.log(`❌ Failed: ${failed} products`);
  console.log(`📊 Total: ${added + 26} products in database`);
  console.log(`========================================\n`);
}

addProducts().finally(() => prisma.$disconnect());
