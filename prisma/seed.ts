import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { RAW_100_PRODUCTS, DECORATION_STAGE_PRODUCTS, PAKISTAN_DECORATION_RENTAL_ITEMS } from './seed-data.js';

const prisma = new PrismaClient();

// High resolution curated floral & wedding image pool
const LUXURY_FLORAL_IMAGES = [
  'https://flowerbouquet.pk/cdn/shop/files/weddingstage.jpg?v=1716522682&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Grand_Mehndi_Celebration_with_Vibrant_Stage_and_Floor_Decor.jpg?v=1737028367&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/walima_decoration.png?v=1726123619&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Majestic_Mehndi_Swing_Setup_with_Elegant_Drapes.jpg?v=1737027276&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/7717ce07c2d4c1c90fec292883f1738b.jpg?v=1721887354&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Enchanting_Staircase_Decor.jpg?v=1735215523&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/images_4.jpg?v=1720001562&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/coolbluez-sehra-bandi-beads.jpg?v=1721802912&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Vibrant_Floral_Mehndi_Stage_with_Traditional_Se.jpg?v=1737027082&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/309.jpg?v=1737027404&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Luxurious_Mehndi_Stage_with_Floral_Elegance.jpg?v=1737027701&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Traditional_Mehndi_Backdrop_with_Marigold_Strings.jpg?v=1737027883&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Festive_Umbrella-Themed_Mehndi_Backdrop.jpg?v=1737028135&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Elegant_Indoor_Mehndi_Setup_with_Floral_and_Marigold_Highlights.jpg?v=1737028248&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Twinkling_Mehndi_Backdrop_with_Fairy_Lights_and_Greenery.jpg?v=1737028502&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Modern_Mehndi_Backdrop_with_Circular_Floral_Design.jpg?v=1737028867&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Outdoor_Floral_Mehndi_Swing_Setup.jpg?v=1737028997&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Rustic_Mehndi_Corner_with_Floral_Arch_and_Tassels.jpg?v=1737029091&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Luxurious_Indoor_Mehndi_Setup_with_Red_Floral_Arch.jpg?v=1737029310&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Elegant_Outdoor_Mehndi_Pavilion_with_Floor_Seating.jpg?v=1737029691&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Minimalist_Mehndi_Backdrop_with_Umbrella_Decorations.jpg?v=1737029802&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Majestic_Mehndi_Stage_with_Vibrant_Drapes_and_Floral_Arrangements.jpg?v=1737029950&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/Fairy_Light_Mehndi_Backdrop_with_Floral_Elegance.jpg?v=1737030041&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/fed56ad4-6ed5-4760-b59d-39c9b666e0da.jpg?v=1721816046&width=533',
  'https://flowerbouquet.pk/cdn/shop/files/4.png',
  'https://flowerbouquet.pk/cdn/shop/files/100-flowers-bouquet.png',
  'https://flowerbouquet.pk/cdn/shop/files/sunflower_bouquet.png',
  'https://flowerbouquet.pk/cdn/shop/files/imported_mixed_roses_bouquet.png',
  'https://flowerbouquet.pk/cdn/shop/files/Elegant_Pink_Flower_Car_Decoration.jpg',
  'https://flowerbouquet.pk/cdn/shop/files/ferrero-rocher-16-pack-perfect-gift.png',
  'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=1200&auto=format&fit=crop',
];

// Product name generators for 500+ realistic catalog
const BOUQUET_VARIANTS = [
  'Royal Velvet Dutch Red Rose Bouquet', 'Champagne Peach Garden Rose Hand-Tie', 'Imperial 100 White Lily & Rose Cascade',
  'Golden Sunburst Sunflower & Daisy Wrap', 'Blush Peony & Hydrangea Luxury Dome', 'Velvet Midnight Black Wrapped Orchid Bouquet',
  'Pastel Lilac & Lavender Scented Bouquet', 'Crimson Passion 200 Rose Grandeur', 'Pure White Jasmine & Orchid Bridal Bunch',
  'Emerald Garden Fresh Foliage & Rose Bouquet', 'Sunset Ombre Orange & Yellow Rose Bundle', 'Tuscan Blossom Eucalyptus & Peony Bouquet',
  'Royal Sovereign 300 Imported Rose Tower', 'Artisanal Kraft Wrapped Wildflower Bunch', 'Sweet Romance Baby Breath & Pink Rose Cone',
  'Golden Gala Calla Lily & White Rose Cascade', 'Moroccan Sunset Chrysanthemum Delight', 'Nordic Frost White Tulips & Peony Wrap',
  'Imperial Grandeur 500 Dutch Rose Installation', 'Velvet Crimson Boutonniere & Hand Bouquet Set',
];

const CAKE_CHOCOLATE_VARIANTS = [
  'Layers Signature Belgian Chocolate Cake (3 lbs)', 'Layers Lotus Biscoff Three-Milk Gourmet Cake (3 lbs)',
  'Layers Royal Pistachio & Saffron Cake (2.5 lbs)', 'Layers Velvet Ferrero Rocher Crunch Cake (3 lbs)',
  'Layers Salted Caramel Dark Fudge Cake (2.5 lbs)', 'Layers Strawberries & Cream Chiffon Cake (3 lbs)',
  'Luxury K9 Crystal Box with 24 Ferrero Rocher', 'Imported Godiva Masterpieces Luxury Chocolate Box',
  'Customized Fondant Engagement Multi-Tier Cake', 'Lindt Swiss Luxury Selection Chocolate Hamper',
  'Cadbury Celebrations Grand Royal Gift Tin', 'Layers German Chocolate Truffle Cake (3 lbs)',
];

const GIFT_CAR_VARIANTS = [
  'Mercedes Benz S-Class Royal Bridal Car Fresh Floral Styling', 'Audi A6 White Lily & Rose Ribbon Car Decor',
  'Giant 5ft Plush Huggable Teddy Bear with Red Rose Heart', 'Handcrafted Golden Floral Jewelry Set for Mehndi Bride',
  'Custom Polaroid Memory Frame with Preserved Rose Dome', 'Artisanal Donut & Chocolate Bouquet with Satin Ribbon',
  'Royal Velvet Ring Platter with Fresh Baby Breath Accents', 'Groom Sehra Bandi Handcrafted Pearl & Crystal Set',
  'Luxury Mirrored Perfume & Rose Bridal Gift Tray', 'Handmade Red Rose & Jasmine Bridal Gajra Set (Pack of 4)',
];

const STAGE_VENUE_VARIANTS = [
  'Grand Imperial 40ft Walima Palace Stage Architecture', 'Royal Barat Red Velvet & Gold Leaf Mandap Stage',
  'Vibrant 35ft Grand Mehndi Stage with Hand-Carved Floral Swing', 'Cascading White Wisteria & Orchid Ceiling Canopy Stage',
  'Botanical Glasshouse Floral Enclosure & Mirrored Catwalk', 'Sovereign Triple-Archway Gilded Staging with LED Edge',
  'Tuscan Pergola Floral Stage with Olive Branches & Peonies', 'Moroccan Islamic Trellis Stage with Brass Urn Lighting',
  'Minimalist Circular Gold Halo Ring Bridal Stage', 'High-Gloss Acrylic Stage Deck with 3D Holographic Backdrop',
  'Traditional Saffron & Emerald Diwan Floor Lounge Setup', 'Enchanting 50ft Grand Entrance Tunnel of 5,000 Roses',
  'Staircase Railing Woven with Fresh Orchids & Fairy Lights', 'Outdoor Lawn Tensile Pavilion with Hanging Marigold Chandeliers',
  'Romantic Sanctuary of 1,000 Floating Candles & Petal Basins', 'Bridal Suite Masehri Bed Styling with Fresh Rose Canopy',
];

const RENTAL_FURNITURE_VARIANTS = [
  'Chiavari Gold Luxury Banquet Chairs (Set of 10)', 'Louis XVI Champagne Velvet Royal Armchairs (Pair of 2)',
  'Ghost Ultra-Clear Acrylic Modern Banquet Chairs (Set of 10)', 'Royal King & Queen Velvet Carved Wedding Throne Set',
  'Traditional Brass Urli Low Floor Seating Chowkis (Set of 6)', 'Mirrored Infinity Dining Banquet Table (8ft Luxury Glass)',
  'Translucent Lucite LED Glow Cocktail Tables (Set of 4)', 'Tiered 5-Arm K9 Optical Crystal Candelabras (Set of 6)',
  'Crystal Waterfall Multi-Tier Chandelier (4ft Rig)', 'Fairy Light Suspended Ceiling Canopy Netting (40ft)',
  'Gilded Baroque Welcome Easel & Rose Hedge Frame', 'Black & Gold Velvet Dramatic Backdrop Drapes (20ft x 12ft Frame)',
  'Seamless High-Gloss White Acrylic Stage Deck Panel (20ft x 12ft)', 'Solid Carved Teakwood Mehndi Swing with Heavy Brass Chains',
  'Rajasthani Hand-Embroidered Decorative Umbrellas (Set of 6)', 'Moroccan Pierced Antique Brass Floor Lanterns (Set of 4)',
];

async function main() {
  console.log('🌱 Starting LUMIÈRE DECOR Massive 500+ Real Database Population...');

  // 1. Clean existing records in correct relation order
  await prisma.activityLog.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.event.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.rentalRequest.deleteMany();
  await prisma.rentalItem.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.service.deleteMany();
  await prisma.package.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.contactInquiry.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Users
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const staffPassword = await bcrypt.hash('Staff@123456', 10);
  const customerPassword = await bcrypt.hash('Customer@123456', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Ali Rajput (Creative Director & Decor Specialist)',
      email: 'admin@lumieredecor.com',
      password: adminPassword,
      phone: '03140660985',
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Hamza Malik (Lead Floral Scenographer)',
      email: 'staff@lumieredecor.com',
      password: staffPassword,
      phone: '03001234567',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      name: 'Dr. Ayesha & Zain Chaudhary',
      email: 'customer@example.com',
      password: customerPassword,
      phone: '03219876543',
      role: 'CUSTOMER',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
    },
  });

  // 3. Customers
  const customer1 = await prisma.customer.create({
    data: {
      userId: customerUser.id,
      name: 'Dr. Ayesha & Zain Chaudhary',
      email: 'customer@example.com',
      phone: '03219876543',
      address: 'DHA Phase 5, Lahore, Pakistan',
      notes: 'VIP Client for Grand Mehndi & Luxury Floral Stage Installations.',
      totalSpend: 254998,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Usman & Fatima Qureshi',
      email: 'usman.qureshi@example.com',
      phone: '03140660985',
      address: 'Gulberg III, Lahore, Pakistan',
      notes: 'Walima & Barat celebration with 500 Roses floral installations.',
      totalSpend: 834999,
    },
  });

  // 4. Core Services
  console.log('👑 Creating Core Services...');
  const servicesData = [
    {
      title: 'Customized Wedding Stage Decorations',
      slug: 'customized-wedding-stage-decorations',
      subtitle: 'Grand Stages, Botanical Canopies & Regal Architecture',
      description: 'Bespoke grand stage architecture, breathtaking fresh flower installations, cinematic intelligent lighting, custom head table styling, and complete venue metamorphosis for unforgettable weddings in Lahore.',
      icon: 'Crown',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/weddingstage.jpg?v=1716522682&width=533',
      priceStartingAt: 120000,
      features: JSON.stringify([
        'Bespoke Grand Stage Architecture (Up to 35ft)',
        'Imported Fresh Dutch Roses, Peonies & Hydrangeas',
        'Cinematic Warm Intelligent Lighting & Spotlights',
        'Bridal Pathway, Glass Runway & Carpet Styling',
        'Custom Sweetheart Stage Throne Chairs Included',
      ]),
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Grand Mehndi & Mayun Celebrations',
      slug: 'grand-mehndi-mayun-celebrations',
      subtitle: 'Vibrant Colors, Traditional Swings & Cultural Splendor',
      description: 'Vibrant marigold and orchid canopies, traditional carved wooden swings, custom velvet floor seating, candlelit walkways, and authentic artisanal touches for high-energy celebrations.',
      icon: 'Sparkles',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/Grand_Mehndi_Celebration_with_Vibrant_Stage_and_Floor_Decor.jpg?v=1737028367&width=533',
      priceStartingAt: 49000,
      features: JSON.stringify([
        'Traditional Hand-Carved Floral Swing Setups',
        'Marigold Strings, Saffron Drapes & Rangoli Floors',
        'Moroccan Brass Lanterns & Low Floor Seating Diwans',
        'Custom Embroidered Umbrella Themed Backdrops',
        'Ambient Fairy Light & Twinkling Light Curtains',
      ]),
      displayOrder: 2,
      isActive: true,
    },
    {
      title: 'Haute Floral Bouquets & Luxury Gifting',
      slug: 'haute-floral-bouquets-luxury-gifting',
      subtitle: 'Imported Roses, Hand-Tied Bouquets & Artisanal Cakes',
      description: 'Curated premium fresh Dutch & local roses, sunflower kraft wraps, handmade floral jewelry, Layers bespoke cakes, and luxury chocolate gift arrangements delivered in Lahore.',
      icon: 'Heart',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/4.png',
      priceStartingAt: 1999,
      features: JSON.stringify([
        'Fresh 100 & 500 Dutch Rose Hand-Tied Bouquets',
        'Fresh Imported Lilies, Chrysanthemums & Sunflowers',
        'Handmade Floral Jewelry & Red Rose Gajras',
        'Layers Bakery Custom Cakes & Ferrero Rocher Gifts',
        'VIP Same-Day Delivery in Lahore with Luxury Wrapping',
      ]),
      displayOrder: 3,
      isActive: true,
    },
    {
      title: 'Affordable Walima & Reception Décor',
      slug: 'affordable-walima-reception-decor',
      subtitle: 'Imperial Crystal Chandeliers & Modern Elegance',
      description: 'Sophisticated atmospheres designed for royal receptions, Walima celebrations, and executive dinners featuring crystal chandeliers, mirrored banquet tables, and fresh imported flora.',
      icon: 'Award',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/walima_decoration.png?v=1726123619&width=533',
      priceStartingAt: 500000,
      features: JSON.stringify([
        'Suspended K9 Crystal Chandelier Rigging',
        'Beveled Mirror Catwalk & Glass Dining Tables',
        'White Rose & Phalaenopsis Orchid Floral Installations',
        'Complete Hall Ambient Warm Lighting Array',
        'Full 3D Spatial Metamorphosis & VIP Lounge',
      ]),
      displayOrder: 4,
      isActive: true,
    },
    {
      title: 'Affordable Barat Luxury Staging',
      slug: 'affordable-barat-luxury-staging',
      subtitle: 'Regal Red & Gold Majesty for the Big Day',
      description: 'Opulent Barat stage setups featuring rich red velvet draping, gilded carved thrones, grand double floral arches, and majestic entrance aisles.',
      icon: 'Briefcase',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/7717ce07c2d4c1c90fec292883f1738b.jpg?v=1721887354&width=533',
      priceStartingAt: 300000,
      features: JSON.stringify([
        'Royal Red Velvet & Gold Leaf Stage Facade',
        'Double-Ring Floral Moon Gate Archway',
        'Gilded King & Queen Velvet Throne Set',
        'Illuminated Mirrored Runway Entrance Foyer',
        'Full On-Site Master Florist Crew on Standby',
      ]),
      displayOrder: 5,
      isActive: true,
    },
    {
      title: 'Cultural Event & Festival Stage Decorations',
      slug: 'cultural-event-festival-decorations',
      subtitle: 'Heritage Artistry, Folk Aesthetics & Gala Metamorphosis',
      description: 'Turnkey environmental transformations for high-profile cultural festivals, university galas, musical nights, and traditional ceremonies across Lahore.',
      icon: 'Sparkle',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/7717ce07c2d4c1c90fec292883f1738b.jpg?v=1721887354&width=533',
      priceStartingAt: 280000,
      features: JSON.stringify([
        'Bespoke 40ft Multi-Tiered Performance Stage',
        'Authentic Pakistani Truck Art & Heritage Motifs',
        'High-Lumen Beam Lights & DMX Stage Lighting',
        'VIP Dignitary Seating & Spun Brass Urn Decor',
      ]),
      displayOrder: 6,
      isActive: true,
    },
    {
      title: 'Enchanting Staircase & Car Decoration',
      slug: 'enchanting-staircase-car-decor',
      subtitle: 'Tunnel of Blossoms, Fairy Lights & Luxury Car Styling',
      description: 'Captivating staircase and foyer installations with cascading floral garlands, Mercedes bridal car decorations, and lush greenery for grand wedding entrances.',
      icon: 'ShieldCheck',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/Elegant_Pink_Flower_Car_Decoration.jpg',
      priceStartingAt: 21999,
      features: JSON.stringify([
        'Full Handrail Fresh Eucalyptus & Orchid Garlands',
        'Mercedes & Luxury Bridal Car Fresh Flower Styling',
        'Dimmable Warm Fairy Light Weave',
        'Floor Hurricane Candle Cylinder Walkway',
      ]),
      displayOrder: 7,
      isActive: true,
    },
    {
      title: 'Affordable Masehri & Sehra Bandi Suite',
      slug: 'affordable-masehri-sehra-bandi-suite',
      subtitle: 'Pure Fresh Roses & Traditional Groom Rituals',
      description: 'Traditional Pakistani Masehri bridal room decoration and Sehra Bandi setups crafted with fresh red and white roses, pearl bead strings, and ambient candlelight.',
      icon: 'Flame',
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/fed56ad4-6ed5-4760-b59d-39c9b666e0da.jpg?v=1721816046&width=533',
      priceStartingAt: 35000,
      features: JSON.stringify([
        '100% Fresh Local & Imported Rose Blooms',
        'Jasmine Petal Net Canopy over Bridal Bed',
        'Handcrafted Pearl String Sehra Backdrop',
        'Floating Candle Bowls & Floral Vase Accents',
      ]),
      displayOrder: 8,
      isActive: true,
    },
  ];

  for (const s of servicesData) {
    await prisma.service.create({ data: s });
  }
  console.log(`✅ Created ${servicesData.length} Core Services.`);

  // 5. Packages
  console.log('📦 Creating Event Packages...');
  const packagesData = [
    {
      name: 'Affordable Walima Grand Luxury Package',
      slug: 'walima-grand-luxury-package',
      tier: 'ROYAL',
      tagline: 'The ultimate royal Walima hall transformation in Lahore.',
      description: 'Complete ballroom transformation featuring imperial crystal chandeliers, mirrored catwalk runway, imported floral stages, and couture head table styling.',
      price: 500000,
      duration: 'Full Day & Evening Setup with Venue Reset',
      guestCapacity: '350 - 600+ Guests',
      features: JSON.stringify([
        '45ft Grand Walima Architectural Stage',
        'Imported Dutch Roses, Hydrangeas & Orchid Canopy',
        'Crystal Chandelier Ceiling Suspensions',
        'Beveled Mirror Catwalk with LED Edge Glow',
        '25 Luxury Guest Table Floral Centerpieces',
        'Senior Creative Director & 15-Person Production Crew',
      ]),
      isRecommended: true,
      isActive: true,
      displayOrder: 1,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/walima_decoration.png?v=1726123619&width=533',
    },
    {
      name: 'Affordable Barat Royal Stage Package',
      slug: 'barat-royal-stage-package',
      tier: 'ROYAL',
      tagline: 'Regal red velvet & gold opulence for traditional Barat celebrations.',
      description: 'Turnkey Barat stage architecture with double floral arches, royal velvet throne, red carpet entrance, and ambient stage spotlighting.',
      price: 300000,
      duration: 'Full Day Event Access',
      guestCapacity: '250 - 450 Guests',
      features: JSON.stringify([
        '38ft Multi-Tiered Royal Barat Stage Deck',
        'Gold Leaf Carved Bride & Groom Throne Chairs',
        'Double-Ring Floral Moon Gate Archway',
        'Entrance Aisle Floral Pillars with Warm Spotlights',
        '15 High & Low Dining Table Floral Centerpieces',
        'White-Glove Setup & Venue Reset Included',
      ]),
      isRecommended: false,
      isActive: true,
      displayOrder: 2,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/7717ce07c2d4c1c90fec292883f1738b.jpg?v=1721887354&width=533',
    },
    {
      name: 'Grand Mehndi Celebration Package',
      slug: 'grand-mehndi-celebration-package',
      tier: 'SIGNATURE',
      tagline: 'Vibrant colors, ornate floor rangoli & luxury seating.',
      description: 'Our premier Mehndi package featuring a colorful stage, hand-carved wooden swing, marigold strings, low floor diwans, and ambient fairy lights.',
      price: 149999,
      duration: 'Full Evening Mehndi Celebration',
      guestCapacity: '150 - 300 Guests',
      features: JSON.stringify([
        '36ft Colorful Mehndi Stage with Floral Framing',
        'Handcrafted Wooden Floral Swing with Silk Drapes',
        'Custom Floor Rangoli & Velvet Bolster Seating',
        'Moroccan Brass Hanging Lanterns & Twinkle Curtains',
        'Henna Lounge Station & Umbrella Backdrops',
      ]),
      isRecommended: true,
      isActive: true,
      displayOrder: 3,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/Grand_Mehndi_Celebration_with_Vibrant_Stage_and_Floor_Decor.jpg?v=1737028367&width=533',
    },
    {
      name: '500 Roses Mega Grandeur Package',
      slug: '500-roses-mega-grandeur-package',
      tier: 'ROYAL',
      tagline: 'Monumental 500 Fresh Dutch Rose Installation & Stage Suite.',
      description: 'An elite floral spectacle featuring 500 freshly picked premium Dutch roses, luxury black wrapping, and matching bridal floral suite.',
      price: 34999,
      duration: 'Delivered & Assembled on Location',
      guestCapacity: 'All Event Scales',
      features: JSON.stringify([
        '500 Fresh Premium Red Dutch Roses',
        'Haute Couture Black & Gold Matte Wrapping',
        'Matching Red Rose Gajras & Boutonnieres',
        'Personalized Calligraphy Card & Velvet Ribbon',
        'Dedicated VIP Chauffeur Delivery in Lahore',
      ]),
      isRecommended: false,
      isActive: true,
      displayOrder: 4,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/4.png',
    },
    {
      name: 'Customized Wedding Stage Package',
      slug: 'customized-wedding-stage-package',
      tier: 'SIGNATURE',
      tagline: 'Bespoke custom floral stage tailored to your venue & colors.',
      description: 'Tailored wedding stage with custom floral arch, backdrop drapes, sweetheart seating, and warm ambient uplighting.',
      price: 120000,
      duration: 'Full Event Setup & Teardown',
      guestCapacity: '100 - 250 Guests',
      features: JSON.stringify([
        '30ft Custom Stage Arch & Backdrop Rig',
        'Fresh Rose & Lily Floral Arrangements',
        'Warm Dimmable LED Uplighting (8 Fixtures)',
        'Custom Bridal Sofa & Stage Carpeting',
        'Welcome Entrance Easel & Floral Frame',
      ]),
      isRecommended: false,
      isActive: true,
      displayOrder: 5,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/weddingstage.jpg?v=1716522682&width=533',
    },
    {
      name: 'Outdoor Mehndi Pavilion & Canopy Package',
      slug: 'outdoor-mehndi-pavilion-package',
      tier: 'SIGNATURE',
      tagline: 'Enchanting lawn setup with tensile canopy & garden seating.',
      description: 'Designed for lawn and farmhouse celebrations with yellow & orange draping, cozy floor cushions, fairy lights, and floral swings.',
      price: 119999,
      duration: 'Full Afternoon / Evening Setup',
      guestCapacity: '100 - 200 Guests',
      features: JSON.stringify([
        '30ft x 30ft Outdoor Tensile Fabric Canopy',
        'Lawn Fairy Light Netting & Tree Lighting',
        'Traditional Wooden Swing & Floor Mattresses',
        'Hanging Tassels & Miniature Umbrellas',
        'Low Chowki Tables with Brass Urli Centerpieces',
      ]),
      isRecommended: false,
      isActive: true,
      displayOrder: 6,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/309.jpg?v=1737027404&width=533',
    },
    {
      name: 'Majestic Mehndi Swing & Lounge Package',
      slug: 'majestic-mehndi-swing-lounge-package',
      tier: 'ESSENTIAL',
      tagline: 'Traditional swing adorned with florals & cozy bolsters.',
      description: 'A charming, focused setup featuring a magnificent floral swing, festive umbrella wall, cushions, and marigold garlands.',
      price: 84999,
      duration: 'Full Evening Event Setup',
      guestCapacity: 'Up to 100 Guests',
      features: JSON.stringify([
        'Solid Wooden Floral Swing with Silk Chiffon Drapes',
        'Surrounding Marigold Strings & Lantern Walkway',
        '10 Embroidered Velvet Bolsters & Floor Cushions',
        'Decorative Rajasthani Umbrella Accents',
        'Warm Pinspot Stage Lighting',
      ]),
      isRecommended: false,
      isActive: true,
      displayOrder: 7,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/Majestic_Mehndi_Swing_Setup_with_Elegant_Drapes.jpg?v=1737027276&width=533',
    },
    {
      name: 'Affordable Intimate Mehndi Ceremony',
      slug: 'affordable-intimate-mehndi-ceremony',
      tier: 'ESSENTIAL',
      tagline: 'Budget-friendly elegance for home & rooftop celebrations.',
      description: 'Compact festive Mehndi backdrop with marigold strings, drapes, low seating, and fairy lights perfect for intimate home events.',
      price: 49000,
      duration: 'Full Event Setup & Teardown',
      guestCapacity: 'Up to 60 Guests',
      features: JSON.stringify([
        '16ft Festive Organza & Marigold Backdrop',
        'Traditional Low Seating Mattress & 6 Bolsters',
        'Warm Micro Fairy Light Mesh',
        'Dholak Corner & Props Display',
        'Quick On-Site 2-Hour Setup',
      ]),
      isRecommended: false,
      isActive: true,
      displayOrder: 8,
      imageUrl: 'https://flowerbouquet.pk/cdn/shop/files/images_4.jpg?v=1720001562&width=533',
    },
  ];

  for (const p of packagesData) {
    await prisma.package.create({ data: p });
  }
  console.log(`✅ Created ${packagesData.length} Packages.`);

  // 6. BUILD 500+ TOTAL ITEMS (125 Client Items + 380 Realistic Systematic Expansions)
  console.log('🌸 Synthesizing 500+ Luxury Products & Inventory Assets...');
  
  interface ProductSeed {
    name: string;
    category: string;
    rentalCategory: string;
    price: number;
    description: string;
    image: string;
    dimensions: string;
    material: string;
    status: string;
    totalQty: number;
    isFeatured: boolean;
  }

  const all500Products: ProductSeed[] = [];

  // A. Add 40 Real Pakistan Decoration Shop Rental Equipment
  PAKISTAN_DECORATION_RENTAL_ITEMS.forEach((prod) => {
    all500Products.push({
      name: prod.name,
      category: prod.category,
      rentalCategory: prod.rentalCategory,
      price: prod.rentalPrice,
      description: prod.description,
      image: prod.image,
      dimensions: prod.dimensions,
      material: prod.material,
      status: prod.status,
      totalQty: prod.totalQty,
      isFeatured: prod.isFeatured,
    });
  });

  // B. Add 25 Grand Stages & Setups
  DECORATION_STAGE_PRODUCTS.forEach((prod, i) => {
    all500Products.push({
      name: prod.name,
      category: prod.category,
      rentalCategory: prod.rentalCategory,
      price: prod.price,
      description: prod.description,
      image: prod.image,
      dimensions: prod.dimensions,
      material: prod.material,
      status: 'In stock',
      totalQty: 4,
      isFeatured: i < 6,
    });
  });

  // C. Add 100 CSV Products from flowerbouquet.pk
  RAW_100_PRODUCTS.forEach((prod, i) => {
    all500Products.push({
      name: prod.name,
      category: prod.category,
      rentalCategory: prod.category,
      price: prod.price,
      description: `${prod.name}. Category: ${prod.category}. Direct online shop item from FlowerBouquet.pk.`,
      image: prod.image,
      dimensions: prod.category === 'Flower Bouquets' ? 'Handheld Fresh Floral Wrap' : prod.category === 'Cakes & Chocolates' ? '2-3 lbs Confectionery / Gift Box' : 'Luxury Gift Keepsake',
      material: prod.category === 'Flower Bouquets' ? 'Fresh Holland Roses, Lilies & Satin Wraps' : prod.category === 'Cakes & Chocolates' ? 'Gourmet Chocolate & Fresh Layers Cake' : 'Handmade Velvet / Plush',
      status: prod.status,
      totalQty: prod.status === 'In stock' ? 12 : 0,
      isFeatured: i < 8,
    });
  });

  // D. Synthesize remaining catalog items across all categories to exceed 500
  let seedIndex = 166;
  const categoriesList = [
    { cat: 'Flower Bouquets', rentalCat: 'Flower Bouquets', names: BOUQUET_VARIANTS, basePrice: 3500, priceStep: 1100 },
    { cat: 'Cakes & Chocolates', rentalCat: 'Cakes & Chocolates', names: CAKE_CHOCOLATE_VARIANTS, basePrice: 2400, priceStep: 300 },
    { cat: 'Gifts', rentalCat: 'Gifts', names: GIFT_CAR_VARIANTS, basePrice: 4500, priceStep: 1400 },
    { cat: 'Floral stages', rentalCat: 'Stage décor', names: STAGE_VENUE_VARIANTS, basePrice: 120000, priceStep: 22000 },
    { cat: 'Mehndi setups', rentalCat: 'Backdrops', names: STAGE_VENUE_VARIANTS, basePrice: 55000, priceStep: 9500 },
    { cat: 'Luxury weddings', rentalCat: 'Arches', names: RENTAL_FURNITURE_VARIANTS, basePrice: 8500, priceStep: 2800 },
    { cat: 'Outdoor décor', rentalCat: 'Lighting', names: RENTAL_FURNITURE_VARIANTS, basePrice: 12500, priceStep: 2400 },
    { cat: 'Entrance décor', rentalCat: 'Decorative props', names: RENTAL_FURNITURE_VARIANTS, basePrice: 6500, priceStep: 1800 },
  ];

  while (all500Products.length < 505) {
    for (const group of categoriesList) {
      if (all500Products.length >= 505) break;
      const baseName = group.names[seedIndex % group.names.length];
      const name = `${baseName} (Edition #${Math.floor(seedIndex / group.names.length) + 1})`;
      const price = group.basePrice + (seedIndex % 15) * group.priceStep;
      const img = LUXURY_FLORAL_IMAGES[seedIndex % LUXURY_FLORAL_IMAGES.length];
      const isInStock = (seedIndex % 7) !== 0;

      all500Products.push({
        name,
        category: group.cat,
        rentalCategory: group.rentalCat,
        price,
        description: `Bespoke ${name}. Engineered and handcrafted for high-society weddings, galas, and floral gifting in Lahore and across Pakistan.`,
        image: img,
        dimensions: 'Standard Luxury Specification',
        material: 'Premium Imported Materials & Fresh Florals',
        status: isInStock ? 'In stock' : 'Out of stock',
        totalQty: isInStock ? 8 : 0,
        isFeatured: seedIndex % 25 === 0,
      });

      seedIndex++;
    }
  }

  console.log(`✨ Total Generated Catalog Size: ${all500Products.length} items!`);

  // 7. INSERT INTO GALLERY IMAGE LOOKBOOK (500+ items)
  console.log('📸 Batch inserting 500+ Gallery items...');
  const galleryBatch = all500Products.map((p, idx) => ({
    title: p.name,
    category: p.category,
    description: `${p.description} Available in Lahore & nationwide across Pakistan. Price: PKR ${p.price.toLocaleString()} (${p.status}).`,
    imageUrl: p.image,
    isFeatured: p.isFeatured,
    displayOrder: idx + 1,
    isActive: true,
    eventType: p.category.includes('Mehndi') ? 'Mehndi Soirée' : p.category.includes('wedding') || p.category.includes('Floral') ? 'Wedding & Walima' : 'Gourmet & Gifts',
    tags: JSON.stringify([p.category, p.status, 'PakistanMarket', 'LahoreDecor', 'Lumiere']),
  }));

  // Batch insert into Gallery in chunks of 100
  for (let i = 0; i < galleryBatch.length; i += 100) {
    const chunk = galleryBatch.slice(i, i + 100);
    await prisma.galleryImage.createMany({ data: chunk });
  }
  console.log(`✅ Seeded ${galleryBatch.length} Gallery Lookbook entries!`);

  // 8. INSERT INTO RENTAL ITEMS & INVENTORY (500+ items)
  console.log('🪑 Batch inserting 500+ Rental Catalog & Inventory Assets...');
  for (let i = 0; i < all500Products.length; i++) {
    const p = all500Products[i];
    const rentalPrice = Math.round(p.price);
    const hourlyRate = Math.round(p.price > 50000 ? p.price / 10 : p.price > 10000 ? p.price / 8 : p.price / 5);
    const replacementCost = Math.round(p.price * 2.2);
    const depositAmount = Math.round(p.price * 0.25);
    const availableQuantity = p.status === 'In stock' ? Math.max(p.totalQty - 1, 1) : 0;
    const rentedQuantity = p.status === 'In stock' ? 1 : 0;

    const slug = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i + 1}`;
    const sku = `LUM-${p.category.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(4, '0')}`;

    const createdRental = await prisma.rentalItem.create({
      data: {
        name: p.name,
        slug,
        category: p.rentalCategory,
        description: p.description,
        imageUrl: p.image,
        rentalPrice,
        hourlyRate,
        replacementCost,
        depositAmount,
        totalQuantity: Math.max(p.totalQty, 1),
        availableQuantity,
        rentedQuantity,
        status: p.status !== 'In stock' ? 'OUT_OF_STOCK' : availableQuantity <= 2 ? 'LOW_STOCK' : 'AVAILABLE',
        dimensions: p.dimensions,
        material: p.material,
        isActive: true,
      },
    });

    await prisma.inventory.create({
      data: {
        sku,
        name: p.name,
        category: p.rentalCategory,
        quantity: Math.max(p.totalQty, 1),
        availableQuantity,
        minThreshold: 2,
        purchaseCost: Math.round(p.price * 0.6),
        rentalPrice,
        hourlyRate,
        status: p.status !== 'In stock' ? 'OUT_OF_STOCK' : availableQuantity <= 2 ? 'LOW_STOCK' : 'IN_STOCK',
        location: `Lahore Warehouse Bay ${String.fromCharCode(65 + (i % 6))} / Rack ${(i % 20) + 1}`,
        lastRestockedAt: new Date(),
        notes: `Linked Catalog Item ID: ${createdRental.id}`,
      },
    });
  }
  console.log(`✅ Seeded ${all500Products.length} Rental Items & Linked Inventory Records!`);

  // 9. Testimonials
  console.log('💬 Creating Authentic Client Testimonials...');
  await prisma.testimonial.createMany({
    data: [
      {
        clientName: 'Dr. Ayesha & Zain Chaudhary',
        clientRole: 'Bride & Groom',
        eventType: 'Grand Mehndi & Barat at Royal Palm Lahore',
        comment: 'Lumière Decor made our Mehndi and Barat look straight out of a royal fairytale! The floral swing, vibrant marigold drapes, and the grand 38ft stage left all 400 guests stunned. Highly recommended!',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 1,
        createdAt: new Date('2026-08-18T20:30:00Z'),
      },
      {
        clientName: 'Usman Qureshi',
        clientRole: 'Host, Walima Reception',
        eventType: 'Walima at The Nishat Hotel Ballroom',
        comment: 'The Walima stage and crystal chandelier setup was beyond breathtaking. The 500 Roses installation and imported fresh flowers transformed the hall into pure luxury. Outstanding professionalism!',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 2,
        createdAt: new Date('2026-08-12T18:45:00Z'),
      },
      {
        clientName: 'Fatima & Bilal Tariq',
        clientRole: 'Newlyweds',
        eventType: 'Outdoor Mehndi at Bedian Road Farmhouse',
        comment: 'The outdoor Mehndi pavilion with yellow & orange drapes and traditional low seating was magical. The team arrived right on schedule and the lighting was sheer perfection.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 3,
        createdAt: new Date('2026-08-05T19:15:00Z'),
      },
      {
        clientName: 'Shehryar Khan',
        clientRole: 'Event Director, Punjab Cultural Society',
        eventType: 'Annual Cultural Heritage Gala at Alhamra Arts Council',
        comment: 'The 40ft cultural stage with authentic motifs and beam lighting set an extraordinary benchmark for cultural scenography in Lahore. Truly world class!',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 4,
        createdAt: new Date('2026-07-28T21:00:00Z'),
      },
    ],
  });

  // 10. Studio Settings
  console.log('⚙️ Initializing Studio Settings...');
  const defaultSettings = [
    { key: 'siteName', value: 'LUMIÈRE DÉCOR & FLORISTRY', category: 'BRANDING', description: 'Studio Brand Name' },
    { key: 'tagline', value: 'Haute Scénographie, Luxury Wedding Stages & Fresh Bouquets in Lahore', category: 'BRANDING', description: 'Brand Tagline' },
    { key: 'admin_notification_email', value: 'alirajpoot8857@gmail.com', category: 'NOTIFICATIONS', description: 'Primary administrator notification email' },
    { key: 'contact_email', value: 'alirajpoot8857@gmail.com', category: 'CONTACT', description: 'Public concierge inquiries email' },
    { key: 'contact_phone', value: '03140660985', category: 'CONTACT', description: 'Studio direct phone line' },
    { key: 'studio_address', value: 'Gulberg III, Lahore, Pakistan', category: 'CONTACT', description: 'Flagship studio address' },
    { key: 'currency', value: 'Rs.', category: 'FINANCIAL', description: 'Currency symbol / ISO code' },
    { key: 'default_deposit_rate', value: '0.25', category: 'FINANCIAL', description: 'Default rental security deposit percentage (25%)' },
    { key: 'sales_tax_rate', value: '0.00', category: 'FINANCIAL', description: 'Sales tax rate' },
    { key: 'sitewide_discount_percentage', value: '10', category: 'FINANCIAL', description: 'Sitewide discount percentage' },
    { key: 'sitewide_discount_active', value: 'true', category: 'FINANCIAL', description: 'Whether discount banner is active' },
    { key: 'sitewide_discount_banner', value: '✨ Season Offer: 10% OFF on all Wedding Stages, Flower Bouquets & Gift Bundles! Use code LUMIERE10', category: 'FINANCIAL', description: 'Discount banner text' },
    { key: 'promo_code', value: 'LUMIERE10', category: 'FINANCIAL', description: 'Active promo coupon' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.create({ data: setting });
  }

  // 11. Sample Rental Request with Real Products
  console.log('📋 Creating Active Rental Request...');
  const rentalItem1 = await prisma.rentalItem.findFirst({ where: { name: { contains: 'Rose Bouquet' } } });
  const rentalItem2 = await prisma.rentalItem.findFirst({ where: { name: { contains: 'Swing' } } });

  if (rentalItem1 && rentalItem2) {
    await prisma.rentalRequest.create({
      data: {
        rentalNumber: 'RENT-782019',
        customerId: customer1.id,
        customerName: 'Dr. Ayesha & Zain Chaudhary',
        customerEmail: 'customer@example.com',
        customerPhone: '03219876543',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        returnDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        rentalMode: 'DAILY',
        rentalHours: 48,
        status: 'APPROVED',
        itemsJson: JSON.stringify([
          {
            itemId: rentalItem2.id,
            name: rentalItem2.name,
            category: rentalItem2.category,
            quantity: 1,
            rentalPrice: rentalItem2.rentalPrice,
            hourlyRate: rentalItem2.hourlyRate,
            depositAmount: rentalItem2.depositAmount,
            imageUrl: rentalItem2.imageUrl,
            total: rentalItem2.rentalPrice,
          },
          {
            itemId: rentalItem1.id,
            name: rentalItem1.name,
            category: rentalItem1.category,
            quantity: 2,
            rentalPrice: rentalItem1.rentalPrice,
            hourlyRate: rentalItem1.hourlyRate,
            depositAmount: rentalItem1.depositAmount,
            imageUrl: rentalItem1.imageUrl,
            total: rentalItem1.rentalPrice * 2,
          },
        ]),
        discount: 8500.0,
        subtotal: rentalItem2.rentalPrice + rentalItem1.rentalPrice * 2,
        deposit: rentalItem2.depositAmount + rentalItem1.depositAmount * 2,
        totalAmount: rentalItem2.rentalPrice + rentalItem1.rentalPrice * 2 - 8500.0,
        notes: 'Please ensure swing and fresh rose bouquets are delivered together for the Mehndi evening.',
      },
    });
  }

  // 12. Bookings & Calendar Events for Admin Dashboard
  console.log('📅 Creating Confirmed Bookings & Calendar Events...');
  const pkgGrandMehndi = await prisma.package.findFirst({ where: { slug: 'grand-mehndi-celebration-package' } });
  const pkgWalima = await prisma.package.findFirst({ where: { slug: 'walima-grand-luxury-package' } });

  if (pkgGrandMehndi) {
    const booking1 = await prisma.booking.create({
      data: {
        bookingNumber: 'LUM-991024',
        customerId: customer1.id,
        customerName: 'Dr. Ayesha & Zain Chaudhary',
        customerEmail: 'customer@example.com',
        customerPhone: '03219876543',
        eventType: 'Mehndi',
        eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        venue: 'The Royal Palm Golf & Country Club, Lahore',
        guestCount: 250,
        budget: 149999,
        packageId: pkgGrandMehndi.id,
        packageName: pkgGrandMehndi.name,
        status: 'CONFIRMED',
        specialRequests: 'Traditional wooden swing with vibrant pink and yellow flowers, marigold floor strings, and fresh rose bouquets on all tables.',
        internalNotes: 'Lead Scenographer Hamza Malik assigned for stage setup starting at 02:00 PM.',
        totalAmount: 149999,
      },
    });

    await prisma.event.create({
      data: {
        title: 'Chaudhary Grand Mehndi Celebration',
        bookingId: booking1.id,
        eventType: 'Mehndi',
        eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        venue: 'The Royal Palm Golf & Country Club, Lahore',
        clientName: 'Dr. Ayesha & Zain Chaudhary',
        clientPhone: '03219876543',
        status: 'SCHEDULED',
        setupTeamNotes: 'Crew arrives at 14:00 for stage rigging, swing placement, and fresh flower pinning.',
      },
    });
  }

  if (pkgWalima) {
    const booking2 = await prisma.booking.create({
      data: {
        bookingNumber: 'LUM-991025',
        customerId: customer2.id,
        customerName: 'Usman & Fatima Qureshi',
        customerEmail: 'usman.qureshi@example.com',
        customerPhone: '03140660985',
        eventType: 'Walima',
        eventDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        venue: 'The Nishat Hotel Grand Ballroom, Lahore',
        guestCount: 500,
        budget: 500000,
        packageId: pkgWalima.id,
        packageName: pkgWalima.name,
        status: 'CONFIRMED',
        specialRequests: 'Grand 45ft Walima stage with crystal chandeliers, beveled mirror catwalk runway, and 500 fresh Dutch roses installation.',
        internalNotes: 'VIP Event. Complete stage crew & floral team required.',
        totalAmount: 500000,
      },
    });

    await prisma.event.create({
      data: {
        title: 'Qureshi Walima Grand Luxury Setup',
        bookingId: booking2.id,
        eventType: 'Walima',
        eventDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        venue: 'The Nishat Hotel Grand Ballroom, Lahore',
        clientName: 'Usman & Fatima Qureshi',
        clientPhone: '03140660985',
        status: 'SCHEDULED',
        setupTeamNotes: 'Load-in at 06:00 AM. Truss assembly and crystal chandelier hoist.',
      },
    });
  }

  // 13. Sales and Purchases
  console.log('💳 Populating Sales & Purchases for Dashboard Accounting...');
  const invItems = await prisma.inventory.findMany({ take: 5 });

  if (invItems.length >= 2) {
    await prisma.sale.create({
      data: {
        saleNumber: 'SALE-2026-001',
        customerId: customer1.id,
        customerName: 'Dr. Ayesha & Zain Chaudhary',
        customerEmail: 'customer@example.com',
        customerPhone: '03219876543',
        subtotal: 149999,
        discount: 14999,
        tax: 0,
        total: 135000,
        paymentStatus: 'PAID',
        notes: 'Deposit paid via Bank Transfer for Grand Mehndi Celebration setup & floral decor.',
        items: {
          create: [
            {
              inventoryId: invItems[0].id,
              itemName: invItems[0].name,
              quantity: 1,
              unitPrice: 149999,
              total: 149999,
            },
          ],
        },
      },
    });

    await prisma.purchase.create({
      data: {
        purchaseNumber: 'PO-2026-001',
        supplierName: 'Pattoki Fresh Flowers & Dutch Imports Market',
        supplierContact: '03009988776',
        subtotal: 85000,
        tax: 0,
        total: 85000,
        paymentStatus: 'PAID',
        notes: 'Imported Peonies, Hydrangeas, White Roses & Marigold Bundles for upcoming Lahore weddings.',
        items: {
          create: [
            {
              inventoryId: invItems[0].id,
              itemName: 'Imported Fresh Floral Bundles (Holland & Pattoki)',
              quantity: 50,
              unitCost: 1700,
              total: 85000,
            },
          ],
        },
      },
    });
  }

  // 14. Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        userName: admin.name,
        userRole: admin.role,
        action: 'POPULATE',
        module: 'ALL',
        description: `Successfully populated massive database of ${all500Products.length}+ products across Services, Packages, Gallery, and Rentals.`,
        createdAt: new Date(),
      },
      {
        userId: staff.id,
        userName: staff.name,
        userRole: staff.role,
        action: 'CONFIRM',
        module: 'BOOKINGS',
        description: 'Confirmed booking LUM-991024 for Grand Mehndi Celebration at Royal Palm.',
        createdAt: new Date(),
      },
    ],
  });

  console.log(`🌟 DATABASE POPULATION COMPLETE: ${all500Products.length}+ products fully populated across site and dashboard!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
