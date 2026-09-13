import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Curated high-resolution luxury event images
const LUXURY_IMAGES = [
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
  'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1478147427282-58a87a120781?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?q=80&w=800&auto=format&fit=crop',
];

const GALLERY_CATEGORIES = [
  'Luxury weddings',
  'Floral stages',
  'Mehndi setups',
  'Birthday themes',
  'Outdoor décor',
  'Reception tables',
  'Entrance décor',
  'Romantic candle setups',
];

const RENTAL_CATEGORIES = [
  { name: 'Chairs', baseDaily: 14.5, baseHourly: 3.5, deposit: 5.0 },
  { name: 'Tables', baseDaily: 120.0, baseHourly: 25.0, deposit: 40.0 },
  { name: 'Arches', baseDaily: 350.0, baseHourly: 65.0, deposit: 100.0 },
  { name: 'Lighting', baseDaily: 180.0, baseHourly: 35.0, deposit: 60.0 },
  { name: 'Centerpieces', baseDaily: 35.0, baseHourly: 8.0, deposit: 12.0 },
  { name: 'Candles', baseDaily: 24.0, baseHourly: 5.0, deposit: 8.0 },
  { name: 'Backdrops', baseDaily: 280.0, baseHourly: 55.0, deposit: 80.0 },
  { name: 'Stage décor', baseDaily: 450.0, baseHourly: 85.0, deposit: 150.0 },
  { name: 'Decorative props', baseDaily: 55.0, baseHourly: 12.0, deposit: 18.0 },
];

const CHAIR_NAMES = [
  'Chavari Gold Luxury Dining Chair', 'Louis XVI Champagne Velvet Armchair', 'Ghost Ultra-Clear Acrylic Chair',
  'Napoleon Brushed Gold Banquet Chair', 'Royal King & Queen Velvet Throne Set', 'French Vintage Oak Cane Back Chair',
  'Modern Nordic Wire Gold Barstool', 'Cross-Back Farmhouse Vineyard Chair', 'Emerald Tufted Velvet Dining Chair',
  'White Leather & Chrome Highback Chair', 'Bamboo Bali Pavilion Lounge Chair', 'Mirrored Infinity Pedestal Chair',
  'Baroque Carved Gold Leaf Throne', 'Bohemian Rattan Peacock Armchair', 'Minimalist Black Steel Wire Chair',
  'Velvet Shell Cocktail Lounge Chair', 'Rose Gold Wire Geometric Chair', 'Traditional Brass Urli Low Seating Stool',
  'Ivory Tufted Ottoman Bench (4ft)', 'Gilded Bistro Folding Chair',
];

const TABLE_NAMES = [
  'Mirrored Infinity Dining Banquet Table (8ft)', 'Solid Rustic Oak Farmhouse Table (10ft)', 'Round Royal Sweetheart Glass Table (6ft)',
  'White Carrara Marble Cocktail Table', 'Brushed Gold Hairpin Banquet Table', 'Translucent Lucite LED Glow Table',
  'Champagne Gold Frame Mirror Table', 'Long Imperial King Feast Table (12ft)', 'Hexagonal Honeycomb Brass Highboy',
  'Cascading Waterfall Glass Dining Table', 'Curved Crescent Moon Bridal Table', 'Antique French Gilt Wood Table',
  'Black Gloss Velvet Trim Banquet Table', 'Geometric Prism Wire Coffee Table', 'Floating Glass Buffet Display Island',
];

const ARCH_NAMES = [
  'Grand Royal Botanical Arch (Double Ring)', 'Hexagonal Brushed Brass Ceremony Arch', 'Floral Moon Gate (9ft Diameter)',
  'Tuscan Timber Rustic Floral Pergola', 'Lucite Floating Crystal Archway', 'Gilded Baroque Triangular Arch',
  'Cascading Wisteria Cathedral Canopy', 'Moroccan Islamic Trellis Arch', 'Open-Top Birchwood Arbor',
  'Gold Circular Halo Arch with LED', 'Minimalist Black Arch Frame', 'Romantic Rose Gold Square Mandap',
];

const LIGHTING_NAMES = [
  'Crystal Waterfall Multi-Tier Chandelier (4ft)', 'Fairy Light Suspended Canopy Netting', 'Vintage Edison Filament String Array',
  'Smart Intelligent RGBW Uplighting Pods', 'Antique Moroccan Pierced Brass Lantern', 'Hanging Glass Bubble Chandelier',
  'Gold Art Deco Geometric Pendant Light', 'Warm Dimmable Pinspot Stage Beam', 'Suspended Candle Chandelier (Brass)',
  'Starry Night Laser Constellation Projector', 'Gilded Floor Candelabra Pillar Lamp', 'Neon Couture Monogram Signage Rig',
];

const CENTERPIECE_NAMES = [
  'Gilded Baroque Floral Centerpiece Riser (32")', 'Tiered 5-Arm K9 Crystal Candelabra', 'Geometric Gold Pentagon Floral Terrarium',
  'Antique Champagne Metal Flower Urn', 'High-Rise Crystal Trumpet Floral Vase', 'Floating Botanical Cylinder Glass Set',
  'Gold Branch Sculptural Table Tree', 'Marble Base Brass Floating Candle Dish', 'Suspended Floral Chandelier Bridge (6ft)',
  'Carved Alabaster Lotus Flower Bowl', 'Venetian Glass Stemmed Hurricane Votive', 'Black Mirror Base Crystal Rose Dome',
];

const CANDLE_NAMES = [
  'Set of 3 Glass Cylinder Hurricane Pillars with Candles', 'Tapered Ivory Beeswax Candelabra Set (8-Pack)', 'Floating Lotus Candle Glass Bowl (Set of 6)',
  'Brushed Gold Geometric Tea Light Pillars', 'Oversized 12-Hour Floor Hurricane Cylinder', 'Moroccan Glass Patterned Votive Cluster',
  'Flameless Luxury Moving-Wick Pillars (Remote)', 'Brass Chamberstick Taper Candle Holders', 'Smoked Amber Glass Hurricane Vases',
];

const BACKDROP_NAMES = [
  'Black Velvet Dramatic Backdrop Drape (12ft x 10ft)', 'Champagne Shimmering Sequin Wall Panel', 'Live Boxwood Greenery Faux Foliage Wall',
  'White Triple-Chiffon Pleated Drapery with Fairy Lights', 'Geometric 3D Gold Laser-Cut Partition', 'Custom Arched Wooden Fluted Backdrop Panels',
  'Frosted Acrylic Monogram Wall with Brass Trim', 'Floral Wall with 5,000 Real-Touch Silk Roses', 'Midnight Navy Starry Fiber-Optic Drape',
];

const STAGE_NAMES = [
  'Gold Mirror Elevated Stage Runway Section (4ft x 8ft)', 'Seamless High-Gloss White Acrylic Stage Deck', 'Curved Bridal Step Platform with Edge Lighting',
  'Curved Velvet Lounge Modular Stage Sofa', 'Glass LED Staging Deck with Water Flow Effect', 'Imperial Royal Sofa (3-Seater) in Gold Velvet',
];

const PROP_NAMES = [
  'Translucent Lucite Acrylic Display Pedestals (Set of 3)', 'Grand 7-Tier Crystal Champagne Glass Tower', 'Ornate Gold Leaf Floor Welcome Easel',
  'Brass Vintage Champagne Chiller Bucket on Stand', 'Giant Illuminated "LOVE" Marquee Letters (4ft)', 'Gilded Floral Photo Frame Booth Prop',
];

async function main() {
  console.log('🌱 Starting LUMIÈRE DECOR Massive Real Database Population (300+ Items)...');

  // Clear existing
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

  console.log('🧹 Cleaned existing records.');

  // 1. Users
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const staffPassword = await bcrypt.hash('Staff@123456', 10);
  const customerPassword = await bcrypt.hash('Customer@123456', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Eleanor Vance (Creative Director)',
      email: 'admin@lumieredecor.com',
      password: adminPassword,
      phone: '03140660985',
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop',
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Julian Hayes (Lead Floral Scenographer)',
      email: 'staff@lumieredecor.com',
      password: staffPassword,
      phone: '03001234567',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      name: 'Sophia Montgomery',
      email: 'customer@example.com',
      password: customerPassword,
      phone: '03219876543',
      role: 'CUSTOMER',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
    },
  });

  // 2. Customers
  const customer1 = await prisma.customer.create({
    data: {
      userId: customerUser.id,
      name: 'Sophia Montgomery',
      email: 'customer@example.com',
      phone: '03219876543',
      address: 'Gulberg III, Lahore, Pakistan',
      notes: 'Prefers blush garden roses, ivory velvet draping, and warm crystal candlelight.',
      totalSpend: 11200,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Marcus & Olivia Sterling',
      email: 'marcus.sterling@example.com',
      phone: '03140660985',
      address: 'F-7/2, Islamabad, Pakistan',
      notes: 'Luxury beachfront wedding at The Glasshouse Estate.',
      totalSpend: 14500,
    },
  });

  // 3. Services
  await prisma.service.createMany({
    data: [
      {
        title: 'Luxury Wedding Styling',
        slug: 'luxury-wedding-styling',
        subtitle: 'Grand Stages, Botanical Canopies & Timeless Romance',
        description: 'Bespoke grand stage architecture, breathtaking fresh flower installations, cinematic intelligent lighting, custom head table styling, and complete venue metamorphosis for unforgettable unions.',
        icon: 'Crown',
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
        priceStartingAt: 4500,
        features: JSON.stringify([
          'Bespoke Grand Stage Architecture',
          'Imported Fresh Dutch Floral Artistry',
          'Cinematic Warm Intelligent Lighting',
          'Silk Chiffon & Velvet Ceiling Draping',
          'Bridal Pathway & Glass Runway Styling',
        ]),
        displayOrder: 1,
        isActive: true,
      },
      {
        title: 'Celebrity Milestone Birthdays',
        slug: 'celebrity-milestone-birthdays',
        subtitle: 'Thematic Concepts, Organic Sculptures & Modern Elegance',
        description: 'High-fashion milestones, custom monogrammed backdrops, mood lighting arrays, organic luxury balloon sculptures, and bespoke centerpiece styling.',
        icon: 'Sparkles',
        imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop',
        priceStartingAt: 2200,
        features: JSON.stringify([
          'Custom Monogrammed Backdrops',
          'Organic Luxury Balloon Sculptures',
          'Dessert Table Spatial Architecture',
          'LED Neon Art & Accent Uplighting',
        ]),
        displayOrder: 2,
        isActive: true,
      },
      {
        title: 'Corporate Galas & Summits',
        slug: 'corporate-galas-summits',
        subtitle: 'Prestige Brand Environments & Executive Distinction',
        description: 'Sophisticated atmospheres designed to elevate corporate prestige, awards ceremonies, luxury brand launches, and executive dinners with immaculate branding harmony.',
        icon: 'Briefcase',
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
        priceStartingAt: 5000,
        features: JSON.stringify([
          'Architectural Brand Integration',
          'Keynote Stage & Podium Styling',
          'VIP Lounge Furniture Groupings',
          'Immersive Entrance Tunnel Displays',
        ]),
        displayOrder: 3,
        isActive: true,
      },
      {
        title: 'Engagements & Mehndi Soirées',
        slug: 'engagements-mehndi-soirees',
        subtitle: 'Cultural Splendor Meets Modern Opulence',
        description: 'Vibrant marigold and orchid canopies, custom velvet floor seating, candlelit walkways, and authentic artisanal touches reimagined with haute luxury precision.',
        icon: 'Heart',
        imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1200&auto=format&fit=crop',
        priceStartingAt: 3200,
        features: JSON.stringify([
          'Custom Velvet Seating & Bolsters',
          'Cascading Exotic Floral Backdrops',
          'Warm Golden Hanging Lanterns',
          'Live Henna Lounge Décor Suite',
        ]),
        displayOrder: 4,
        isActive: true,
      },
    ],
  });

  // 4. Packages
  await prisma.package.createMany({
    data: [
      {
        name: 'Intimate Elegance',
        slug: 'intimate-elegance',
        tier: 'ESSENTIAL',
        tagline: 'Refined sophistication for intimate gatherings & ceremonies.',
        description: 'Designed for private celebrations, micro-weddings, and VIP dinner parties that desire bespoke luxury floral styling on an intimate scale.',
        price: 2800,
        duration: 'Full Day Setup & Takedown',
        guestCapacity: 'Up to 75 Guests',
        features: JSON.stringify([
          'Custom Minimalist Floral Stage Setup',
          'Up to 8 Fresh Floral Dining Centerpieces',
          'Warm Ambient Uplighting (6 Fixtures)',
          'Welcome Entrance Easel & Gold Floral Frame',
          'Sweetheart / Head Table Styling',
          'On-Site Setup & Teardown Crew',
        ]),
        isRecommended: false,
        isActive: true,
        displayOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1000&auto=format&fit=crop',
      },
      {
        name: 'Signature Grandeur',
        slug: 'signature-grandeur',
        tier: 'SIGNATURE',
        tagline: 'Our premier all-inclusive luxury experience.',
        description: 'The pinnacle of bespoke wedding and gala styling. Features grand scale floral arches, customized stage architectures, mood lighting arrays, and meticulous table art.',
        price: 6500,
        duration: 'Full Day & Pre-Event Rehearsal Access',
        guestCapacity: 'Up to 250 Guests',
        features: JSON.stringify([
          'Grand Architectural Stage with 3D Floral Canopy',
          'Up to 20 High & Low Premium Floral Centerpieces',
          'Bridal Catwalk Runway with Glass / Mirrored Finish',
          'Hanging Crystal Chandeliers & Fairy Light Ceiling',
          'Intelligent Lighting Array with Custom Color Grading',
          'Photo-Op Floral Wall (10ft x 10ft) with Custom Neon',
        ]),
        isRecommended: true,
        isActive: true,
        displayOrder: 2,
        imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000&auto=format&fit=crop',
      },
      {
        name: 'Royal Heritage',
        slug: 'royal-heritage',
        tier: 'ROYAL',
        tagline: 'Uncompromising opulence with unlimited bespoke artistic scope.',
        description: 'An elite couture experience. Unlimited scope for mega-weddings, celebrity celebrations, and multi-day celebrations with full architectural venue remodeling.',
        price: 14500,
        duration: 'Multi-Day / Weekend Exclusive Access',
        guestCapacity: '300+ Guests / Unlimited',
        features: JSON.stringify([
          'Complete Venue Metamorphosis & Spatial Remodeling',
          'Botanical Glasshouse Floral Enclosure & Massive Arches',
          'Unlimited Fresh Imported Exotics (Peonies, Orchids, Hydrangeas)',
          'Laser-Cut Gold Staging with Water Feature / Candle Basins',
          'Grand 360° Suspended Floral Chandelier Forest',
          'Senior Creative Director & 15-Person Production Crew',
        ]),
        isRecommended: false,
        isActive: true,
        displayOrder: 3,
        imageUrl: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=1000&auto=format&fit=crop',
      },
    ],
  });

  // 5. POPULATE ~150 GALLERY LOOKBOOK IMAGES
  console.log('📸 Generating 150+ Gallery Lookbook entries...');
  const galleryItems = [];
  let gCount = 1;

  const galleryTitlesByCategory: Record<string, string[]> = {
    'Luxury weddings': [
      'Celestial Romance at The Beverly Estate', 'Imperial Ivory & Gold Ballroom Gala', 'Château de Versailles Inspired Pavilion',
      'The Rose Quartz Grand Conservatory', 'Crystal Palace Metamorphosis Wedding', 'The Opulent White Magnolia Pavilion',
      'Gilded Archway of 10,000 Dutch Roses', 'The Mirrored Runway Wedding Ceremony', 'Sovereign Gold & Velvet Grand Reception',
      'Cascading Hydrangea Ceiling Installation', 'The Royal Glass Conservatory Union', 'The Sunset Cliffside Floral Sanctuary',
      'Midnight Blue & Starlight Wedding Gala', 'The Gilded Lily Sovereign Wedding', 'The Botanical Cathedral Floral Symphony',
      'Emerald Garden Estate Evening Ceremony', 'Pure White Peony Forest Ballroom', 'The Gilded Versailles Palace Reception',
      'Vintage French Vineyard Union Ceremony', 'The Diamond Tiered Cathedral Reception',
    ],
    'Floral stages': [
      'The Gilded Orchid Grand Architectural Stage', 'Sculptural 3D Geometric Floral Canopy', 'Cascading White Wisteria Grand Arch Stage',
      'The Royal Golden Mandap with Lotus Basins', 'Suspended Floating Rose Cloud Platform', 'Baroque Crown Staging with Silk Draping',
      'The Emerald Botanical Sanctuary Stage', 'Golden Ring Floral Halo Ceremony Stage', 'The Sovereign Triple-Archway Staging',
      'The Crystal Fountain & Orchid Bridal Stage', 'High-Gloss White Mirrored Floral Deck', 'The Tuscan Pergola Staging with Olive Branches',
      'The Celestial Starburst Stage Architecture', 'Velvet & Gold Trimmed Royal Head Stage', 'The Modern Minimalist Brass Ring Platform',
      'The Cascading Phalaenopsis Masterpiece Stage', 'The Gilded Baroque Floral Amphitheater', 'The Floating Water Lily Glass Stage',
      'Imperial Canopy Stage with Crystal Refractions', 'The Blossom Archway Cathedral Staging',
    ],
    'Mehndi setups': [
      'Marigold Sunset Courtyard Pavilion', 'Saffron & Fuchsia Velvet Floor Lounge', 'Artisanal Brass Urli Rosewater Sanctuary',
      'The Royal Rajasthani Palace Henna Suite', 'Vibrant Orchid & Jasmine Hanging Canopy', 'Moroccan Mosaic Floor Cushion Pavilion',
      'The Gilded Dholak & Floral Swing Stage', 'Sunset Marigold Tunnel with Golden Lanterns', 'The Jewel-Tone Silk Draping Courtyard',
      'Exotic Lotus & Henna Garden Lounge', 'Embroidered Velvet Diwan Ceremony Suite', 'The Shimmering Mirror-Work Mehndi Canopy',
      'Artisanal Terracotta Urn Floral Pathway', 'Golden Hanging Bell & Jasmine Stage', 'The Royal Courtyard Sangeet Pavilion',
      'Jewel-Tone Marquee with Candlelight Basins', 'The Golden Peacock Floral Swing Lounge', 'Traditional Saffron & Emerald Mehndi Haven',
      'The Royal Silk Brocade Canopy Pavilion', 'The Sunset Henna Terrace with Brass Lanterns',
    ],
    'Birthday themes': [
      'Emerald & Gold 40th Milestone Gala', 'The Haute Couture Black Tie Birthday', 'Pastel Blossom & Gold 30th Celebration',
      'The Diamond Jubilee Royal Ballroom Gala', 'Neon Euphoria Luxe 21st Milestone', 'Gatsby 1920s Art Deco Speakeasy Lounge',
      'Midnight Celestial Star 50th Gala', 'Champagne Bubble Wall VIP Birthday Lounge', 'The Golden Safari Luxury Thematic Gala',
      'Monochrome Haute Chic Birthday Studio', 'The Beverly Hills Rosé Garden Party', 'Vintage Hollywood Gilded Glamour Gala',
      'The Crystal Mirage Milestone Soirée', 'Velvet Speakeasy & Cigar Lounge Styling', 'Tropical Botanical Havana Nights Gala',
      'The Golden Sovereign 60th Jubilee Suite', 'Midnight in Paris Rooftop Birthday Soirée', 'The Gilded Balloon Sculpture Masterpiece',
      'The Imperial Crown Milestone Birthday Gala', 'Crystal Chandelier Runway Birthday Bash',
    ],
    'Outdoor décor': [
      'Vineyard Twilight Alfresco Canopy', 'Malibu Cliffside Sunset Ocean Pavilion', 'The Glasshouse Botanical Garden Pavilion',
      'Eucalyptus & Fairy Light Forest Dining', 'The Olive Grove Gilded Long Table Feast', 'Under the Stars Tuscan Pergola Canopy',
      'Private Estate Poolside Floating Lanterns', 'The French Countryside Lavender Terrace', 'The Gilded Gazebo by the Reflecting Pool',
      'Rustic Luxe Timber Pergola with Wisteria', 'The Seaside Floral Archway at Dusk', 'The Gilded Greenhouse Botanical Pavilion',
      'Sunset Meadow Mirrored Tablescape Suite', 'Candlelit Stone Courtyard Gala Dinner', 'The Gilded Orchard Nightfall Canopy',
      'The Open-Air Glass Roof Starlight Pavilion', 'The Olive Tree Canopy Alfresco Banquet', 'The Coastal Cliffside Twilight Sanctuary',
    ],
    'Reception tables': [
      'Mirrored Royal Banquet Tablescape', 'Cascading Botanical Runner with Peonies', 'Towering Gold Candelabra Grand Tablescape',
      'Black Velvet & Gold Rimmed Royal Dining', 'The Crystal Stemware & Orchid Masterpiece', 'White Italian Linen & Floating Candle Table',
      'The Emerald Velvet & Gilded Silver Table', 'Minimalist Acrylic Floating Centerpiece Table', 'The Baroque Golden Charger Tablescape',
      'Cascading Hydrangea & Crystal Glass Table', 'The Gilded Versailles Imperial Feast Table', 'The Borosilicate Glass Candle Tablescape',
      'Modern High-Gloss Mirror Banquet Styling', 'The Regal Navy & Gold Trim Tablescape', 'Champagne Silk Runner with White Orchids',
      'The Floating Glass Sphere Tablescape Design', 'The Gilded Renaissance Dining Experience', 'The Crystal Waterfall Head Table Layout',
    ],
    'Entrance décor': [
      'The Gilded Grand Foyer Tunnel of Blossoms', 'Avenue of 1,000 Warm Pillar Lanterns', 'The 40ft White Cherry Blossom Archway',
      'Grand Baroque Double-Door Floral Garland', 'Illuminated Mirrored Runway Entrance Foyer', 'The Gilded Welcome Easel & Rose Hedge',
      'The Cascading Orchid Grand Staircase', 'The Crystal Chandelier Entrance Pavilion', 'Velvet Draped Foyer with Golden Urns',
      'The Botanical Pergola Welcome Archway', 'The Floating Candle Basin Welcome Foyer', 'The Golden Archway with Monogrammed Neon',
      'The Royal White Carpet Floral Aisle', 'The Wisteria Cloud Grand Ballroom Entrance', 'The Gilded Topiary & Lantern Pathway',
      'The Imperial Double-Ring Floral Welcome Arch', 'The Gilded Mirror Hallway with Crystal Beams', 'The Secret Garden Arched Entryway',
    ],
    'Romantic candle setups': [
      'Sanctuary of 1,000 Floating Candles', 'Tiered Hurricane Cylinder Warm Pathway', 'The Borosilicate Glass Pillar Glow Room',
      'Golden Candelabra Symphony of Light', 'The Candlelit Reflection Pool Ceremony', 'Floating Votive Glass Bowls with Rose Petals',
      'The Gilded Brass Floor Lantern Walkway', 'The Spiral Candlelit Ceremony Stage', 'The Secret Cave of Warm Candlelight',
      'The Floating Glass Globe Candle Installation', 'The Mirrored Runway with Candle Edging', 'The Gilded Baroque Floor Candle Array',
      'Warm Dimmable Amber Light & Pillar Haven', 'The Candlelit Archway of Sacred Romance', 'The Twilight Forest of 500 Hurricane Votives',
      'The Sunset Terrace Candlelit Intimate Feast', 'The Floating Lotus Wax Basin Sanctuary', 'The Velvet & Candlelit Fireside Lounge',
    ],
  };

  for (const cat of GALLERY_CATEGORIES) {
    const titles = galleryTitlesByCategory[cat] || [];
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      const imgUrl = LUXURY_IMAGES[(gCount + i) % LUXURY_IMAGES.length];
      galleryItems.push({
        title,
        category: cat,
        description: `Bespoke ${cat.toLowerCase()} installation engineered with imported fresh botanicals, custom architectural framing, and dimmable warm mood lighting.`,
        imageUrl: imgUrl,
        isFeatured: i < 3,
        displayOrder: gCount,
        isActive: true,
        eventType: cat.includes('wedding') || cat.includes('Floral') ? 'Wedding Reception' : 'Luxury Event',
        tags: JSON.stringify([cat.split(' ')[0], 'Luxury', 'Bespoke', 'Lumiere']),
      });
      gCount++;
    }
  }

  await prisma.galleryImage.createMany({ data: galleryItems });
  console.log(`✅ Created ${galleryItems.length} Gallery items!`);

  // 6. POPULATE ~150 RENTAL INVENTORY ITEMS
  console.log('🪑 Generating 150+ Rental Catalog & Inventory items...');
  const rentalCatalogData = [
    { cat: 'Chairs', names: CHAIR_NAMES, baseP: 16.5, baseH: 4.0, dep: 5.0, mat: 'Hardwood & Velvet', dim: '36"H x 16"W' },
    { cat: 'Tables', names: TABLE_NAMES, baseP: 135.0, baseH: 28.0, dep: 45.0, mat: 'Tempered Glass & Brass', dim: '8ft x 40" x 30"' },
    { cat: 'Arches', names: ARCH_NAMES, baseP: 380.0, baseH: 70.0, dep: 120.0, mat: 'Heavy Steel & Brass', dim: '10ft Diameter' },
    { cat: 'Lighting', names: LIGHTING_NAMES, baseP: 195.0, baseH: 40.0, dep: 65.0, mat: 'K9 Optical Crystal', dim: '4ft Height' },
    { cat: 'Centerpieces', names: CENTERPIECE_NAMES, baseP: 32.0, baseH: 7.5, dep: 10.0, mat: 'Spun Brass & Glass', dim: '32" Height' },
    { cat: 'Candles', names: CANDLE_NAMES, baseP: 24.0, baseH: 5.5, dep: 8.0, mat: 'Borosilicate Glass', dim: 'Various Heights' },
    { cat: 'Backdrops', names: BACKDROP_NAMES, baseP: 290.0, baseH: 60.0, dep: 85.0, mat: 'Heavyweight Velvet & Truss', dim: '12ft x 10ft' },
    { cat: 'Stage décor', names: STAGE_NAMES, baseP: 480.0, baseH: 95.0, dep: 160.0, mat: 'Aluminum Truss & Acrylic', dim: '8ft x 4ft Deck' },
    { cat: 'Decorative props', names: PROP_NAMES, baseP: 65.0, baseH: 14.0, dep: 20.0, mat: 'Museum Grade Acrylic', dim: 'Various' },
  ];

  let rItemIndex = 1;
  for (const catGroup of rentalCatalogData) {
    for (let i = 0; i < catGroup.names.length; i++) {
      const name = catGroup.names[i];
      const rentalPrice = +(catGroup.baseP * (1 + (i % 5) * 0.12)).toFixed(2);
      const hourlyRate = +(catGroup.baseH * (1 + (i % 5) * 0.12)).toFixed(2);
      const replacementCost = +(rentalPrice * 6.5).toFixed(2);
      const depositAmount = +(catGroup.dep * (1 + (i % 4) * 0.1)).toFixed(2);
      const totalQuantity = 10 + (rItemIndex % 8) * 15;
      const rentedQuantity = Math.floor(totalQuantity * 0.15);
      const availableQuantity = totalQuantity - rentedQuantity;

      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${1000 + rItemIndex}`;
      const sku = `RENT-${catGroup.cat.slice(0, 3).toUpperCase()}-${String(rItemIndex).padStart(3, '0')}`;
      const imgUrl = LUXURY_IMAGES[rItemIndex % LUXURY_IMAGES.length];

      const createdRental = await prisma.rentalItem.create({
        data: {
          name,
          slug,
          category: catGroup.cat,
          description: `Luxury event rental: ${name}. Handcrafted with ${catGroup.mat} to provide immaculate visual elegance for high-society banquets, weddings, and galas.`,
          imageUrl: imgUrl,
          rentalPrice,
          hourlyRate,
          replacementCost,
          depositAmount,
          totalQuantity,
          availableQuantity,
          rentedQuantity,
          status: availableQuantity <= 5 ? 'LOW_STOCK' : 'AVAILABLE',
          dimensions: catGroup.dim,
          material: catGroup.mat,
          isActive: true,
        },
      });

      await prisma.inventory.create({
        data: {
          sku,
          name,
          category: catGroup.cat,
          quantity: totalQuantity,
          availableQuantity,
          minThreshold: 5,
          purchaseCost: replacementCost * 0.45,
          rentalPrice,
          hourlyRate,
          status: availableQuantity <= 5 ? 'LOW_STOCK' : 'IN_STOCK',
          location: `Warehouse Bay ${String.fromCharCode(65 + (rItemIndex % 6))}`,
          lastRestockedAt: new Date(),
          notes: `Asset linked to Rental Item: ${createdRental.id}`,
        },
      });

      rItemIndex++;
    }
  }

  console.log(`✅ Created ${rItemIndex - 1} Rental & Inventory items!`);

  // 7. Testimonials with Timestamps & Avatars
  await prisma.testimonial.createMany({
    data: [
      {
        clientName: 'Lady Catherine & Lord Alistair Vance',
        clientRole: 'Bride & Groom',
        eventType: 'Château Royal Wedding in Provence',
        comment: 'Lumière Decor completely transcended our expectations. Walking into the ballroom felt like stepping into an enchanted golden dream. Every single floral arch, candle fixture, and table runner was sheer perfection.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 1,
        createdAt: new Date('2026-08-18T20:30:00Z'),
      },
      {
        clientName: 'Alexander Hayes',
        clientRole: 'Executive Producer, Forbes Global Summits',
        eventType: 'Annual Leadership Gala at The Beverly Hilton',
        comment: 'The architectural precision and brand fidelity delivered by the Lumière team was world-class. Our international delegates were completely mesmerized by the stage aesthetic and intelligent lighting.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 2,
        createdAt: new Date('2026-08-12T18:45:00Z'),
      },
      {
        clientName: 'Genevieve & Liam Sterling',
        clientRole: 'Newlyweds',
        eventType: 'The Beverly Hills Conservatory Wedding',
        comment: 'Eleanor and her design atelier are true visionary artists. The suspended floral chandelier forest left our 300 guests speechless. We could not have dreamed of a more romantic evening.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 3,
        createdAt: new Date('2026-08-05T19:15:00Z'),
      },
      {
        clientName: 'Dr. Evelyn Martinez',
        clientRole: 'Host, 50th Diamond Jubilee Gala',
        eventType: 'Private Villa Birthday Gala, Malibu',
        comment: 'From the initial 3D design concept to the late-night event coordination, everything was seamless. The gold mirror tables and candlelight created a warm, unforgettable luxury ambience.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 4,
        createdAt: new Date('2026-07-28T21:00:00Z'),
      },
      {
        clientName: 'Julian & Camille Delacroix',
        clientRole: 'Clients, Luxury Anniversary Gala',
        eventType: 'Bel Air Estate Anniversary Soirée',
        comment: 'The attention to detail was astonishing. The custom monogrammed backdrop, imported peonies, and velvet lounges made our 25th anniversary celebration look like a royal ball.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 5,
        createdAt: new Date('2026-07-15T17:30:00Z'),
      },
      {
        clientName: 'Samantha Kensington',
        clientRole: 'Lead Wedding Planner, Luxe Events Co.',
        eventType: 'The Glasshouse Estate Wedding',
        comment: 'As a luxury event planner with over 15 years in high society weddings, Lumière Decor is the only scenography team I trust with my most discerning VIP clientele. Absolute perfection every time.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=400&auto=format&fit=crop',
        isFeatured: true,
        displayOrder: 6,
        createdAt: new Date('2026-07-01T16:00:00Z'),
      },
    ],
  });

  // 8. Studio Settings
  const defaultSettings = [
    { key: 'siteName', value: 'LUMIÈRE DECOR', category: 'BRANDING', description: 'Studio Brand Name' },
    { key: 'tagline', value: 'Haute Scénographie & Luxury Event Decoration', category: 'BRANDING', description: 'Brand Tagline' },
    { key: 'contact_email', value: 'concierge@lumieredecor.com', category: 'CONTACT', description: 'Public concierge inquiries email' },
    { key: 'contact_phone', value: '03140660985', category: 'CONTACT', description: 'Studio direct phone line' },
    { key: 'studio_address', value: '9450 Wilshire Blvd, Suite 800, Beverly Hills, CA 90212', category: 'CONTACT', description: 'Flagship studio address' },
    { key: 'currency', value: 'PKR', category: 'FINANCIAL', description: 'Currency symbol / ISO code' },
    { key: 'default_deposit_rate', value: '0.30', category: 'FINANCIAL', description: 'Default rental security deposit percentage (30%)' },
    { key: 'sales_tax_rate', value: '0.08', category: 'FINANCIAL', description: 'Sales tax rate (8%)' },
    { key: 'sitewide_discount_percentage', value: '15', category: 'FINANCIAL', description: 'Sitewide discount percentage' },
    { key: 'sitewide_discount_active', value: 'true', category: 'FINANCIAL', description: 'Whether discount banner is active' },
    { key: 'sitewide_discount_banner', value: '✨ Grand Season Offer: Enjoy 15% OFF across all Luxury Packages & Rental Catalog! Use code LUMIERE15', category: 'FINANCIAL', description: 'Discount banner text' },
    { key: 'promo_code', value: 'LUMIERE15', category: 'FINANCIAL', description: 'Active promo coupon' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.create({ data: setting });
  }

  // 9. Sample Rental Request
  const chairItem = await prisma.rentalItem.findFirst({ where: { category: 'Chairs' } });
  const tableItem = await prisma.rentalItem.findFirst({ where: { category: 'Tables' } });

  await prisma.rentalRequest.create({
    data: {
      rentalNumber: 'RENT-804912',
      customerId: customer1.id,
      customerName: 'Sophia Montgomery',
      customerEmail: 'customer@example.com',
      customerPhone: '03219876543',
      eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      rentalMode: 'DAILY',
      rentalHours: 48,
      status: 'APPROVED',
      itemsJson: JSON.stringify([
        {
          itemId: chairItem?.id,
          name: chairItem?.name,
          category: 'Chairs',
          quantity: 20,
          rentalPrice: chairItem?.rentalPrice,
          hourlyRate: chairItem?.hourlyRate,
          depositAmount: chairItem?.depositAmount,
          imageUrl: chairItem?.imageUrl,
          total: (chairItem?.rentalPrice || 16.5) * 20,
        },
        {
          itemId: tableItem?.id,
          name: tableItem?.name,
          category: 'Tables',
          quantity: 2,
          rentalPrice: tableItem?.rentalPrice,
          hourlyRate: tableItem?.hourlyRate,
          depositAmount: tableItem?.depositAmount,
          imageUrl: tableItem?.imageUrl,
          total: (tableItem?.rentalPrice || 135) * 2,
        },
      ]),
      discount: 79.5,
      subtotal: 530.0,
      deposit: 180.0,
      totalAmount: 630.5,
      notes: 'Please ensure gold chairs have freshly steamed ivory cushions.',
    },
  });

  // 10. Bookings & Calendar Events
  const pkgRoyal = await prisma.package.findFirst({ where: { slug: 'royal-heritage' } });
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: 'LUM-882190',
      customerId: customer2.id,
      customerName: 'Marcus & Olivia Sterling',
      customerEmail: 'marcus.sterling@example.com',
      customerPhone: '03140660985',
      eventType: 'Wedding',
      eventDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      venue: 'The Glasshouse Estate, Malibu',
      guestCount: 220,
      budget: 14500,
      packageId: pkgRoyal?.id,
      packageName: 'Royal Heritage',
      status: 'CONFIRMED',
      specialRequests: 'All-white floral palette with cascading wisteria canopy and gold mirrored catwalk.',
      internalNotes: 'VIP commission. Lead Scenographer Julian Hayes assigned to oversee setup.',
      totalAmount: 14500,
    },
  });

  await prisma.event.create({
    data: {
      title: 'Sterling Royal Wedding Setup',
      bookingId: booking1.id,
      eventType: 'Wedding',
      eventDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
      venue: 'The Glasshouse Estate, Malibu',
      clientName: 'Marcus & Olivia Sterling',
      clientPhone: '03140660985',
      status: 'SCHEDULED',
      setupTeamNotes: 'Crew arrives at 06:00 AM for stage rigging and floral arch pinning.',
    },
  });

  console.log('🌟 SEEDING COMPLETE: 300+ real luxury items populated across Gallery, Rentals, Inventory & Reviews!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
