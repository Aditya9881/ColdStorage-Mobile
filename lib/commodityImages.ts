/**
 * Commodity Image Map — ColdStorage Mobile
 *
 * Maps common Indian agricultural commodity names to emoji + color pairs
 * for visual identification in mandi price cards.
 *
 * The map uses fuzzy matching (lowercase, trimmed) so "potato" matches "Potato".
 * Fallback: generic produce icon with green background.
 */

export interface CommodityVisual {
  emoji: string;
  bg: string;       // background color for the image area
  accent: string;   // accent color for price text
}

const COMMODITY_MAP: Record<string, CommodityVisual> = {
  // Vegetables
  potato:     { emoji: '🥔', bg: '#F5E6C8', accent: '#8B6914' },
  onion:      { emoji: '🧅', bg: '#F8E8F0', accent: '#9B2D5B' },
  tomato:     { emoji: '🍅', bg: '#FFE5E5', accent: '#CC3333' },
  brinjal:    { emoji: '🍆', bg: '#E8E0F0', accent: '#6B3FA0' },
  cabbage:    { emoji: '🥬', bg: '#E5F5E0', accent: '#2D7A2D' },
  cauliflower:{ emoji: '🥦', bg: '#E8F5E8', accent: '#3D8B3D' },
  capsicum:   { emoji: '🫑', bg: '#E8F5E0', accent: '#4A8A1E' },
  carrot:     { emoji: '🥕', bg: '#FFF0E0', accent: '#D97706' },
  peas:       { emoji: '🫛', bg: '#E0F5E0', accent: '#2D8B2D' },
  beans:      { emoji: '🫘', bg: '#F0E8D8', accent: '#7A5C2D' },
  cucumber:   { emoji: '🥒', bg: '#E5F5E5', accent: '#3A7A3A' },
  pumpkin:    { emoji: '🎃', bg: '#FFF5E0', accent: '#CC7A00' },
  'bitter gourd': { emoji: '🥒', bg: '#E0F0E0', accent: '#3A7A3A' },
  'bottle gourd': { emoji: '🥒', bg: '#E5F5EA', accent: '#2D7A4D' },
  'ridge gourd':  { emoji: '🥒', bg: '#E0F5E5', accent: '#3A8A4A' },
  okra:       { emoji: '🌿', bg: '#E5F0E5', accent: '#3A7A3A' },
  'lady finger': { emoji: '🌿', bg: '#E5F0E5', accent: '#3A7A3A' },
  radish:     { emoji: '🥕', bg: '#FFE8E8', accent: '#CC4444' },
  spinach:    { emoji: '🥬', bg: '#E0F5E0', accent: '#2D7A2D' },
  'green chilli': { emoji: '🌶️', bg: '#E0F5E0', accent: '#2D8B2D' },
  chilli:     { emoji: '🌶️', bg: '#FFE0E0', accent: '#CC3333' },
  garlic:     { emoji: '🧄', bg: '#F8F0E8', accent: '#8B7A5C' },
  ginger:     { emoji: '🫚', bg: '#FFF0D8', accent: '#B8860B' },
  mushroom:   { emoji: '🍄', bg: '#F5EDE0', accent: '#8B6914' },
  'sweet potato': { emoji: '🍠', bg: '#F5E0D0', accent: '#9B4D1F' },
  drumstick:  { emoji: '🌿', bg: '#E0F0E0', accent: '#3A7A3A' },
  amaranthus: { emoji: '🌿', bg: '#E8F0E0', accent: '#4A7A2D' },
  coriander:  { emoji: '🌿', bg: '#E0F5E0', accent: '#2D7A2D' },
  mint:       { emoji: '🌿', bg: '#E0F8E8', accent: '#1A7A4A' },

  // Fruits
  apple:      { emoji: '🍎', bg: '#FFE5E5', accent: '#CC3333' },
  banana:     { emoji: '🍌', bg: '#FFF8E0', accent: '#B8960B' },
  mango:      { emoji: '🥭', bg: '#FFF5E0', accent: '#CC8800' },
  grapes:     { emoji: '🍇', bg: '#F0E0F5', accent: '#7A3D8B' },
  orange:     { emoji: '🍊', bg: '#FFF0E0', accent: '#CC7700' },
  lemon:      { emoji: '🍋', bg: '#FFFDE0', accent: '#A89200' },
  lime:       { emoji: '🍋', bg: '#E8F8E0', accent: '#4A8A1E' },
  papaya:     { emoji: '🍈', bg: '#FFF5E8', accent: '#CC8844' },
  watermelon: { emoji: '🍉', bg: '#FFE5E8', accent: '#CC3344' },
  pomegranate:{ emoji: '🫐', bg: '#FFE0E5', accent: '#CC2244' },
  guava:      { emoji: '🍐', bg: '#E8F5E0', accent: '#4A8A2D' },
  coconut:    { emoji: '🥥', bg: '#F0EBE0', accent: '#7A6A4A' },
  pineapple:  { emoji: '🍍', bg: '#FFF8E0', accent: '#B89600' },
  jackfruit:  { emoji: '🍈', bg: '#FFF5D0', accent: '#A88A00' },
  sapota:     { emoji: '🥝', bg: '#F0E8D8', accent: '#7A5C2D' },
  'custard apple': { emoji: '🍏', bg: '#E8F5E0', accent: '#4A8A2D' },
  fig:        { emoji: '🫐', bg: '#F0E0E8', accent: '#8B3D5C' },
  litchi:     { emoji: '🍒', bg: '#FFE0E5', accent: '#CC2244' },

  // Grains & Pulses
  wheat:      { emoji: '🌾', bg: '#FFF5D0', accent: '#A88A00' },
  rice:       { emoji: '🍚', bg: '#F8F5E8', accent: '#8B8A5C' },
  paddy:      { emoji: '🌾', bg: '#F0F0D0', accent: '#8B8A00' },
  maize:      { emoji: '🌽', bg: '#FFF8D0', accent: '#B89600' },
  corn:       { emoji: '🌽', bg: '#FFF8D0', accent: '#B89600' },
  bajra:      { emoji: '🌾', bg: '#F5F0D8', accent: '#8B8040' },
  jowar:      { emoji: '🌾', bg: '#F5F0E0', accent: '#8B7A40' },
  ragi:       { emoji: '🌾', bg: '#F0E8D8', accent: '#7A6A40' },
  soyabean:   { emoji: '🫘', bg: '#F0F0D8', accent: '#7A7A2D' },
  soybean:    { emoji: '🫘', bg: '#F0F0D8', accent: '#7A7A2D' },
  'green gram':  { emoji: '🫘', bg: '#E0F0D8', accent: '#4A7A2D' },
  'black gram':  { emoji: '🫘', bg: '#E8E0D8', accent: '#5C4A3A' },
  'bengal gram':  { emoji: '🫘', bg: '#F5F0D8', accent: '#8B7A2D' },
  arhar:      { emoji: '🫘', bg: '#FFF0D8', accent: '#B88A00' },
  urad:       { emoji: '🫘', bg: '#E8E0D8', accent: '#5C4A3A' },
  moong:      { emoji: '🫘', bg: '#E0F0D8', accent: '#4A7A2D' },
  masoor:     { emoji: '🫘', bg: '#FFE8D8', accent: '#CC6644' },
  chana:      { emoji: '🫘', bg: '#F5F0D0', accent: '#8B8000' },
  groundnut:  { emoji: '🥜', bg: '#F5EDD8', accent: '#8B7A40' },
  mustard:    { emoji: '🌻', bg: '#FFF8D0', accent: '#B89600' },
  'sesame':   { emoji: '🌰', bg: '#F5EDD8', accent: '#7A6A40' },
  'cotton':   { emoji: '🧶', bg: '#F8F5F0', accent: '#8B8A7A' },
  jute:       { emoji: '🧶', bg: '#F5F0D8', accent: '#7A7A40' },
  sugarcane:  { emoji: '🎋', bg: '#E8F5E0', accent: '#3A7A2D' },
  tobacco:    { emoji: '🍂', bg: '#F0E8D0', accent: '#7A6A2D' },

  // Spices
  turmeric:   { emoji: '🟡', bg: '#FFF8D0', accent: '#B89600' },
  'dry chillies': { emoji: '🌶️', bg: '#FFE0E0', accent: '#CC2222' },
  'red chillies': { emoji: '🌶️', bg: '#FFE0E0', accent: '#CC2222' },
  cumin:      { emoji: '🫚', bg: '#F5EDD8', accent: '#7A6A40' },
  cinnamon:   { emoji: '🫚', bg: '#F0E0D0', accent: '#8B5C2D' },
  cardamom:   { emoji: '🌿', bg: '#E8F5E8', accent: '#3D7A3D' },
  pepper:     { emoji: '🫚', bg: '#E8E0D8', accent: '#4A4A3A' },
  clove:      { emoji: '🫚', bg: '#F0E0D0', accent: '#7A4A2D' },
  'copra':    { emoji: '🥥', bg: '#F0EBE0', accent: '#7A6A4A' },
  'arecanut': { emoji: '🌰', bg: '#F0E8D0', accent: '#7A5C2D' },
  cashewnut:  { emoji: '🥜', bg: '#F8F0D8', accent: '#8B7A40' },

  // Flowers
  marigold:   { emoji: '🌼', bg: '#FFF8D0', accent: '#CC9900' },
  jasmine:    { emoji: '🌸', bg: '#FFF0F5', accent: '#CC6688' },
  rose:       { emoji: '🌹', bg: '#FFE0E5', accent: '#CC2244' },

  // Others
  tea:        { emoji: '🍵', bg: '#E8F0E0', accent: '#4A7A2D' },
  coffee:     { emoji: '☕', bg: '#F0E8D8', accent: '#5C4A2D' },
  rubber:     { emoji: '🌳', bg: '#E0F0E0', accent: '#2D7A2D' },
  'dry coconut': { emoji: '🥥', bg: '#F5EDE0', accent: '#7A6A4A' },
};

/**
 * Get visual info for a commodity name.
 * Does fuzzy matching — lowercases and trims the input.
 */
export function getCommodityVisual(commodityName: string): CommodityVisual {
  const key = commodityName.toLowerCase().trim();

  // Direct match
  if (COMMODITY_MAP[key]) return COMMODITY_MAP[key];

  // Partial match — check if any key is included in the commodity name
  for (const [mapKey, visual] of Object.entries(COMMODITY_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return visual;
    }
  }

  // Fallback
  return { emoji: '🥬', bg: '#E8F5E8', accent: '#2D7A3D' };
}

/**
 * Get a large display emoji for a commodity (for card headers)
 */
export function getCommodityEmoji(commodityName: string): string {
  return getCommodityVisual(commodityName).emoji;
}
