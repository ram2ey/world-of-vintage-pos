import { PrismaClient, StaffRole, DiscountType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _skuCounter = 0
const sku = () => `WOV-${String(++_skuCounter).padStart(5, '0')}`

let _barcodeCounter = 0
const barcode = () => `9784900${String(++_barcodeCounter).padStart(5, '0')}`

async function main() {
  console.log('🌱  Seeding World of Vintage database…\n')

  // Wipe existing data in dependency order
  await prisma.transactionItem.deleteMany()
  await prisma.customerVisit.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.markdown.deleteMany()
  await prisma.discount.deleteMany()
  await prisma.variant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.staff.deleteMany()

  // ── Categories ─────────────────────────────────────────────────────────────

  const [tops, bottoms, dresses, accessories, footwear] = await Promise.all([
    prisma.category.create({ data: { name: 'Tops',        icon: 'Shirt',      colorHex: '#3B82F6' } }),
    prisma.category.create({ data: { name: 'Bottoms',     icon: 'Layers',     colorHex: '#8B5CF6' } }),
    prisma.category.create({ data: { name: 'Dresses',     icon: 'Sparkles',   colorHex: '#EC4899' } }),
    prisma.category.create({ data: { name: 'Accessories', icon: 'Gem',        colorHex: '#F59E0B' } }),
    prisma.category.create({ data: { name: 'Footwear',    icon: 'Footprints', colorHex: '#10B981' } }),
  ])

  console.log('  ✓ 5 categories')

  // ── Products & variants ────────────────────────────────────────────────────

  type ProductSpec = {
    name: string
    categoryId: string
    basePrice: number
    description: string
    color: string
    colorHex: string
    sizes: string[]
  }

  const productSpecs: ProductSpec[] = [
    // Tops
    {
      name: 'Kente Print Crop Top',
      categoryId: tops.id,
      basePrice: 120,
      description: 'Vibrant kente-inspired crop top, perfect for casual outings.',
      color: 'Multicolor',
      colorHex: '#9333EA',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      name: 'Batik Oversized Blouse',
      categoryId: tops.id,
      basePrice: 180,
      description: 'Relaxed batik blouse with statement sleeves.',
      color: 'Indigo',
      colorHex: '#4F46E5',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      name: 'Ankara Print Shirt',
      categoryId: tops.id,
      basePrice: 150,
      description: 'Classic button-down with bold ankara print.',
      color: 'Terracotta',
      colorHex: '#C2410C',
      sizes: ['S', 'M', 'L', 'XL'],
    },
    {
      name: 'Linen Button-Down Top',
      categoryId: tops.id,
      basePrice: 200,
      description: "Breathable linen top, ideal for Accra's climate.",
      color: 'Sand',
      colorHex: '#D2B48C',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      name: 'Wax Print Peplum Top',
      categoryId: tops.id,
      basePrice: 165,
      description: 'Fitted peplum silhouette in vibrant wax print.',
      color: 'Multicolor',
      colorHex: '#EC4899',
      sizes: ['XS', 'S', 'M', 'L'],
    },
    // Bottoms
    {
      name: 'Kente Strip Trousers',
      categoryId: bottoms.id,
      basePrice: 250,
      description: 'Wide-leg trousers with authentic kente strip detailing.',
      color: 'Black & Gold',
      colorHex: '#1C1C1C',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      name: 'Ankara Wide-Leg Pants',
      categoryId: bottoms.id,
      basePrice: 280,
      description: 'Bold ankara wide-leg pants for a statement look.',
      color: 'Multicolor',
      colorHex: '#3B82F6',
      sizes: ['S', 'M', 'L', 'XL'],
    },
    {
      name: 'Linen Straight Trousers',
      categoryId: bottoms.id,
      basePrice: 220,
      description: 'Tailored linen trousers in neutral tones.',
      color: 'Sand',
      colorHex: '#D2B48C',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      name: 'Wax Print Midi Skirt',
      categoryId: bottoms.id,
      basePrice: 195,
      description: 'A-line midi skirt in classic wax print.',
      color: 'Terracotta',
      colorHex: '#C2410C',
      sizes: ['XS', 'S', 'M', 'L'],
    },
    // Dresses
    {
      name: 'Ankara Wrap Dress',
      categoryId: dresses.id,
      basePrice: 420,
      description: 'Flattering wrap silhouette in ankara print.',
      color: 'Multicolor',
      colorHex: '#EC4899',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      name: 'Kente Maxi Dress',
      categoryId: dresses.id,
      basePrice: 550,
      description: 'Floor-length kente maxi for special occasions.',
      color: 'Gold & Black',
      colorHex: '#B45309',
      sizes: ['S', 'M', 'L', 'XL'],
    },
    {
      name: 'Batik Shirt Dress',
      categoryId: dresses.id,
      basePrice: 380,
      description: 'Effortless batik shirt dress, day to evening.',
      color: 'Indigo',
      colorHex: '#4F46E5',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      name: 'Linen Sundress',
      categoryId: dresses.id,
      basePrice: 320,
      description: 'Breezy linen sundress in earthy tones.',
      color: 'Sand',
      colorHex: '#D2B48C',
      sizes: ['XS', 'S', 'M', 'L'],
    },
    // Accessories
    {
      name: 'Beaded Necklace Set',
      categoryId: accessories.id,
      basePrice: 85,
      description: 'Hand-beaded necklace set in traditional Ghanaian colors.',
      color: 'Multicolor',
      colorHex: '#F59E0B',
      sizes: ['ONE SIZE'],
    },
    {
      name: 'Kente Clutch Bag',
      categoryId: accessories.id,
      basePrice: 150,
      description: 'Structured clutch with kente fabric panel.',
      color: 'Gold & Black',
      colorHex: '#B45309',
      sizes: ['ONE SIZE'],
    },
    {
      name: 'Ankara Head Wrap',
      categoryId: accessories.id,
      basePrice: 60,
      description: 'Versatile ankara head wrap, 2m length.',
      color: 'Multicolor',
      colorHex: '#EC4899',
      sizes: ['ONE SIZE'],
    },
    {
      name: 'Woven Leather Belt',
      categoryId: accessories.id,
      basePrice: 95,
      description: 'Hand-stitched leather belt with brass buckle.',
      color: 'Tan',
      colorHex: '#92400E',
      sizes: ['S/M', 'L/XL'],
    },
    // Footwear
    {
      name: 'Woven Leather Sandals',
      categoryId: footwear.id,
      basePrice: 280,
      description: 'Handcrafted leather sandals with woven strap.',
      color: 'Tan',
      colorHex: '#92400E',
      sizes: ['37', '38', '39', '40', '41', '42'],
    },
    {
      name: 'Kente Print Slides',
      categoryId: footwear.id,
      basePrice: 180,
      description: 'Comfy slides with kente print upper.',
      color: 'Multicolor',
      colorHex: '#9333EA',
      sizes: ['37', '38', '39', '40', '41', '42'],
    },
    {
      name: 'Ankara Mule Heels',
      categoryId: footwear.id,
      basePrice: 350,
      description: 'Block-heel mules in ankara fabric.',
      color: 'Terracotta',
      colorHex: '#C2410C',
      sizes: ['37', '38', '39', '40', '41'],
    },
  ]

  for (const spec of productSpecs) {
    await prisma.product.create({
      data: {
        name: spec.name,
        categoryId: spec.categoryId,
        basePrice: spec.basePrice,
        description: spec.description,
        barcode: barcode(),
        variants: {
          create: spec.sizes.map((size) => ({
            size,
            color: spec.color,
            colorHex: spec.colorHex,
            quantity: Math.floor(Math.random() * 12) + 3,
            sku: sku(),
            lowStockThreshold: 3,
          })),
        },
      },
    })
    console.log(`  ✓ ${spec.name}`)
  }

  console.log(`\n  ✓ 20 products + variants`)

  // ── Staff ──────────────────────────────────────────────────────────────────

  const [managerPin, cashierPin] = await Promise.all([
    bcrypt.hash('1234', 10),
    bcrypt.hash('5678', 10),
  ])

  await prisma.staff.createMany({
    data: [
      { name: 'Abena Agyemang', pin: managerPin, role: StaffRole.manager },
      { name: 'Kweku Darko',    pin: cashierPin, role: StaffRole.cashier },
    ],
  })

  console.log('  ✓ 2 staff members')

  // ── Customers ──────────────────────────────────────────────────────────────

  await prisma.customer.createMany({
    data: [
      {
        name: 'Ama Owusu',
        phone: '0244123456',
        email: 'ama.owusu@gmail.com',
        preferredSizes: JSON.stringify(['S', 'M']),
        styleNotes: 'Prefers bold ankara prints. Usually shopping for work attire.',
      },
      {
        name: 'Kofi Mensah',
        phone: '0554987321',
        preferredSizes: JSON.stringify(['L', 'XL']),
        styleNotes: 'Casual style — linen and earth tones only.',
      },
      {
        name: 'Akosua Asante',
        phone: '0241765432',
        email: 'akosua.asante@yahoo.com',
        preferredSizes: JSON.stringify(['M']),
        styleNotes: 'Loves kente pieces for events and celebrations.',
      },
      {
        name: 'Kwame Boateng',
        phone: '0277654321',
        preferredSizes: JSON.stringify(['M', 'L']),
        styleNotes: 'Minimalist — neutrals and natural fabrics only.',
      },
      {
        name: 'Abena Frimpong',
        phone: '0208765432',
        email: 'abena.f@outlook.com',
        preferredSizes: JSON.stringify(['XS', 'S']),
        styleNotes: 'Fashion-forward, open to new styles. Big on accessories.',
      },
    ],
  })

  console.log('  ✓ 5 customers')

  // ── Discounts ──────────────────────────────────────────────────────────────

  await prisma.discount.createMany({
    data: [
      { code: 'WELCOME10', type: DiscountType.percentage, value: 10, isActive: true },
      { code: 'LOYAL20',   type: DiscountType.percentage, value: 20, isActive: true },
      { code: 'GHS50OFF',  type: DiscountType.fixed,      value: 50, isActive: true },
    ],
  })

  console.log('  ✓ 3 discount codes')

  console.log('\n✅  Seed complete!\n')
  console.log('Default staff PINs:')
  console.log('  Manager  —  Abena Agyemang  →  1234')
  console.log('  Cashier  —  Kweku Darko     →  5678\n')
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
