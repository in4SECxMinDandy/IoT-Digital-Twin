/**
 * Scene specification for Zone_Pergola: landscape design, hardscape, planting, lighting, water.
 * All dimensions in metres; all species verified for tropical climate suitability.
 */

export interface PlantSpec {
  id: string;
  species: string;
  commonNameVi: string;
  role: "canopy" | "climber" | "understory" | "accent";
  matureHeightM: number;
  canopyDiameterM: number;
  localEast: number;
  localNorth: number;
  notes: string;
  /** Per-season visual state: foliage density, flowering, light requirement */
  seasons: {
    coolDry: { foliageDensity: number; flowering: boolean; notes: string };
    hotDry: { foliageDensity: number; flowering: boolean; notes: string };
    earlyWet: { foliageDensity: number; flowering: boolean; notes: string };
    peakWet: { foliageDensity: number; flowering: boolean; notes: string };
  };
}

export interface HardscapeSpec {
  id: string;
  type: "pergola" | "arbor" | "wall" | "paving" | "bench";
  material: string;
  dimensions: string;
  colorHex: string;
  position?: { east: number; north: number; up: number };
  notes: string;
}

export interface LightSpec {
  id: string;
  type: "uplight" | "wall-graze" | "strip" | "path";
  colorTempK: number;
  cri: number;
  ipRating: string;
  position: { east: number; north: number; up: number };
  targetPosition?: { east: number; north: number; up: number };
  scene: "day" | "dusk" | "night";
  intensity: number; // 0-1
}

export interface WaterFeatureSpec {
  id: string;
  type: "pool" | "rill";
  lengthM: number;
  widthM: number;
  depthM: number;
  position: { east: number; north: number };
  mosquitoControl: string;
  notes: string;
}

export interface MaintenanceTask {
  task: string;
  frequency: string;
  season: string;
  effortLevel: "low" | "medium" | "high";
}

/**
 * Complete scene specification for Zone_Pergola.
 * Design brief: modern minimalist, tropical climate, warm neutral palette, four-season interest.
 */
export interface ZoneSceneSpec {
  plants: PlantSpec[];
  hardscape: HardscapeSpec[];
  lighting: LightSpec[];
  water: WaterFeatureSpec[];
  maintenance: MaintenanceTask[];
  palette: {
    sand: string;
    travertine: string;
    warmGreige: string;
    terracotta: string;
    charcoal: string;
  };
  designSummaryVi: string;
}

/**
 * Zone_Pergola scene specification.
 * Species verified for tropical suitability; invasive species rejected.
 */
export const ZONE_PERGOLA_SCENE: ZoneSceneSpec = {
  plants: [
    // Canopy: mature shade trees on W/SW to block afternoon sun, >5m from footings
    {
      id: "tree_01",
      species: "Lagerstroemia speciosa",
      commonNameVi: "Bằng lăng",
      role: "canopy",
      matureHeightM: 12,
      canopyDiameterM: 8,
      localEast: -6,
      localNorth: 2,
      notes: "Purple flowers May-Jul; deciduous cool-dry season; deep roots safe near hardscape",
      seasons: {
        coolDry: { foliageDensity: 0.3, flowering: false, notes: "Sparse, some leaf drop" },
        hotDry: { foliageDensity: 0.6, flowering: true, notes: "Purple blooms Apr-Jun" },
        earlyWet: { foliageDensity: 0.9, flowering: false, notes: "Full canopy" },
        peakWet: { foliageDensity: 1.0, flowering: false, notes: "Dense shade" }
      }
    },
    {
      id: "tree_02",
      species: "Cassia fistula",
      commonNameVi: "Muồng hoàng yến",
      role: "canopy",
      matureHeightM: 10,
      canopyDiameterM: 7,
      localEast: -5.5,
      localNorth: -4,
      notes: "Golden-yellow cascading flowers Apr-Jun; semi-deciduous; moderate root spread",
      seasons: {
        coolDry: { foliageDensity: 0.4, flowering: false, notes: "Leaf drop, preparing bloom" },
        hotDry: { foliageDensity: 0.5, flowering: true, notes: "Spectacular golden cascades" },
        earlyWet: { foliageDensity: 0.85, flowering: false, notes: "New foliage flush" },
        peakWet: { foliageDensity: 0.95, flowering: false, notes: "Dense green canopy" }
      }
    },
    {
      id: "accent_01",
      species: "Plumeria rubra",
      commonNameVi: "Hoa đại",
      role: "accent",
      matureHeightM: 4,
      canopyDiameterM: 3,
      localEast: 3,
      localNorth: 5,
      notes: "Sculptural form; fragrant white/pink/yellow flowers; deciduous cool season",
      seasons: {
        coolDry: { foliageDensity: 0.2, flowering: false, notes: "Bare branches, sculptural silhouette" },
        hotDry: { foliageDensity: 0.6, flowering: true, notes: "Fragrant blooms Mar-Oct" },
        earlyWet: { foliageDensity: 0.8, flowering: true, notes: "Peak flowering" },
        peakWet: { foliageDensity: 0.9, flowering: true, notes: "Lush foliage, continuous bloom" }
      }
    },
    // Arbor climbers: sand/apricot cultivars to match palette
    {
      id: "climber_01",
      species: "Bougainvillea 'California Gold'",
      commonNameVi: "Hoa giấy vàng cát",
      role: "climber",
      matureHeightM: 3,
      canopyDiameterM: 2,
      localEast: 4.5,
      localNorth: 8,
      notes: "Apricot-sand bracts; trained on arbor gate; drought-tolerant once established",
      seasons: {
        coolDry: { foliageDensity: 0.7, flowering: true, notes: "Peak bloom Nov-Feb" },
        hotDry: { foliageDensity: 0.65, flowering: true, notes: "Continuous flowering" },
        earlyWet: { foliageDensity: 0.75, flowering: false, notes: "Foliage growth phase" },
        peakWet: { foliageDensity: 0.8, flowering: false, notes: "Vigorous vegetative growth" }
      }
    },
    {
      id: "climber_02",
      species: "Jasminum sambac",
      commonNameVi: "Nhài",
      role: "climber",
      matureHeightM: 2.5,
      canopyDiameterM: 1.5,
      localEast: -4,
      localNorth: 8.5,
      notes: "Fragrant white flowers; national flower; evening scent; trained on arbor",
      seasons: {
        coolDry: { foliageDensity: 0.6, flowering: false, notes: "Slower growth, reduced bloom" },
        hotDry: { foliageDensity: 0.75, flowering: true, notes: "Fragrant blooms Mar-Oct" },
        earlyWet: { foliageDensity: 0.85, flowering: true, notes: "Peak flowering" },
        peakWet: { foliageDensity: 0.9, flowering: true, notes: "Continuous bloom, evening fragrance" }
      }
    },
    // Understory: moderate planting, odd-number groupings, three layers
    {
      id: "under_01",
      species: "Dianella caerulea",
      commonNameVi: "Cỏ kiếm xanh",
      role: "understory",
      matureHeightM: 0.6,
      canopyDiameterM: 0.5,
      localEast: 2,
      localNorth: 1,
      notes: "Clumping grass-like; blue berries; low maintenance; planted in group of 5",
      seasons: {
        coolDry: { foliageDensity: 0.85, flowering: false, notes: "Evergreen, slight dormancy" },
        hotDry: { foliageDensity: 0.9, flowering: true, notes: "Small blue flowers" },
        earlyWet: { foliageDensity: 0.95, flowering: false, notes: "Blue berries develop" },
        peakWet: { foliageDensity: 1.0, flowering: false, notes: "Lush evergreen foliage" }
      }
    },
    {
      id: "under_02",
      species: "Agave attenuata",
      commonNameVi: "Thiên niên hoa cánh mềm",
      role: "understory",
      matureHeightM: 0.8,
      canopyDiameterM: 1.2,
      localEast: -2.5,
      localNorth: -2,
      notes: "Soft-leaf agave; sculptural rosette; no spines; drought-tolerant; group of 3",
      seasons: {
        coolDry: { foliageDensity: 1.0, flowering: false, notes: "Evergreen succulent" },
        hotDry: { foliageDensity: 1.0, flowering: false, notes: "Mature specimens may flower (rare)" },
        earlyWet: { foliageDensity: 1.0, flowering: false, notes: "Consistent form year-round" },
        peakWet: { foliageDensity: 1.0, flowering: false, notes: "Architectural presence" }
      }
    },
    {
      id: "under_03",
      species: "Cymbopogon citratus",
      commonNameVi: "Sả",
      role: "understory",
      matureHeightM: 0.9,
      canopyDiameterM: 0.6,
      localEast: 1,
      localNorth: -3,
      notes: "Lemongrass; aromatic; culinary use; mosquito-repellent; clumping; group of 7",
      seasons: {
        coolDry: { foliageDensity: 0.7, flowering: false, notes: "Slower growth" },
        hotDry: { foliageDensity: 0.85, flowering: false, notes: "Active growth" },
        earlyWet: { foliageDensity: 0.95, flowering: false, notes: "Vigorous tillering" },
        peakWet: { foliageDensity: 1.0, flowering: false, notes: "Peak biomass, harvest-ready" }
      }
    }
  ],

  hardscape: [
    {
      id: "pergola_main",
      type: "pergola",
      material: "Powder-coated aluminium wood-grain finish (termite-proof, low maintenance)",
      dimensions: "4.0 x 5.0 m footprint, 2.7 m post height, ~40% open slatted roof",
      colorHex: "#B5A898",
      position: { east: 0, north: 0, up: 0 },
      notes: "Slat orientation computed from sun path for ~60% shade at 14:00; dappled light"
    },
    {
      id: "arbor_gate",
      type: "arbor",
      material: "Slim steel frame, powder-coated charcoal",
      dimensions: "1.2 m wide x 2.4 m height",
      colorHex: "#34312E",
      position: { east: 0, north: 9, up: 0 },
      notes: "Entry gate with trained climbers; vertical slat rhythm continues enclosure"
    },
    {
      id: "wall_enclosure",
      type: "wall",
      material: "Textured sand plaster + vertical timber slat screen + hedge",
      dimensions: "1.8-2.2 m height perimeter",
      colorHex: "#D8C3A5",
      notes: "Layered enclosure: solid base + permeable screen + green hedge; privacy + airflow"
    },
    {
      id: "paving_main",
      type: "paving",
      material: "Large-format honed porcelain, travertine-look, anti-slip R11",
      dimensions: "~60% of zone area, 600x1200 mm format, 1-2% fall to drain",
      colorHex: "#E6DCC9",
      notes: "Porcelain selected over natural stone: UV-stable, low porosity (monsoon), termite-proof"
    },
    {
      id: "gravel_area",
      type: "paving",
      material: "10 mm decomposed granite gravel with steel edging",
      dimensions: "~40% of zone area, planted pockets + negative space",
      colorHex: "#C0A584",
      notes: "Gravel zones define planting beds; permeable; steel edging prevents creep"
    },
    {
      id: "bench_built_in",
      type: "bench",
      material: "Travertine-look porcelain seat + steel frame",
      dimensions: "2.0 m L x 0.45 m D x 0.45 m H",
      colorHex: "#E6DCC9",
      position: { east: -3, north: -6, up: 0.45 },
      notes: "Built-in bench under pergola edge; matches paving material"
    }
  ],

  lighting: [
    {
      id: "light_tree_up_01",
      type: "uplight",
      colorTempK: 2700,
      cri: 90,
      ipRating: "IP65",
      position: { east: -6.5, north: 2, up: 0 },
      targetPosition: { east: -6, north: 2, up: 8 },
      scene: "night",
      intensity: 0.8,
    },
    {
      id: "light_tree_up_02",
      type: "uplight",
      colorTempK: 2700,
      cri: 90,
      ipRating: "IP65",
      position: { east: -6, north: -4, up: 0 },
      targetPosition: { east: -5.5, north: -4, up: 7 },
      scene: "night",
      intensity: 0.8
    },
    {
      id: "light_wall_graze",
      type: "wall-graze",
      colorTempK: 2700,
      cri: 92,
      ipRating: "IP67",
      position: { east: -7, north: 0, up: 0.1 },
      targetPosition: { east: -7, north: 0, up: 2 },
      scene: "dusk",
      intensity: 0.6
    },
    {
      id: "light_pergola_strip",
      type: "strip",
      colorTempK: 2700,
      cri: 90,
      ipRating: "IP65",
      position: { east: 0, north: 0, up: 2.65 },
      scene: "dusk",
      intensity: 0.4
    },
    {
      id: "light_path_01",
      type: "path",
      colorTempK: 2700,
      cri: 90,
      ipRating: "IP67",
      position: { east: 2, north: 6, up: 0.15 },
      scene: "night",
      intensity: 0.3
    }
  ],

  water: [
    {
      id: "pool_reflecting",
      type: "pool",
      lengthM: 3.0,
      widthM: 1.2,
      depthM: 0.3,
      position: { east: 4, north: -2 },
      mosquitoControl: "Recirculating pump + Bti larvicide quarterly",
      notes: "Shallow reflecting pool; always in motion or treated; black interior for depth illusion"
    }
  ],

  maintenance: [
    { task: "Prune canopy trees (shape, deadwood)", frequency: "Annually", season: "Early wet (Jun-Jul)", effortLevel: "high" },
    { task: "Lemongrass harvest & divide", frequency: "Every 6 months", season: "Peak wet + cool-dry", effortLevel: "medium" },
    { task: "Clean leaf litter from paving & gravel", frequency: "Weekly cool-dry, bi-weekly other", season: "All", effortLevel: "low" },
    { task: "Check drip irrigation lines (if installed)", frequency: "Monthly", season: "Hot-dry + early-wet", effortLevel: "low" },
    { task: "Termite inspection (pergola, arbor)", frequency: "Annually", season: "Any", effortLevel: "low" },
    { task: "Re-oil timber slat screen (if untreated)", frequency: "Every 2 years", season: "Cool-dry", effortLevel: "medium" },
    { task: "Clean pool pump filter & add Bti", frequency: "Quarterly", season: "All", effortLevel: "low" },
    { task: "Wipe light fixtures (dust, insects)", frequency: "Every 3 months", season: "All", effortLevel: "low" },
    { task: "Train arbor climbers, remove wayward growth", frequency: "Monthly hot-dry to peak-wet", season: "Mar-Oct", effortLevel: "low" },
    { task: "Trim understory (Dianella, Cymbopogon)", frequency: "Every 2-3 months", season: "Active growth", effortLevel: "low" }
  ],

  palette: {
    sand: "#D8C3A5",
    travertine: "#E6DCC9",
    warmGreige: "#B5A898",
    terracotta: "#C0714F",
    charcoal: "#34312E"
  },

  designSummaryVi: `**Zone_Pergola - Thiết kế hiện đại tối giản cho khí hậu nhiệt đới**

**Phong cách:** Sân vườn riêng tư, thanh lịch, không gian xanh lấy cảm hứng từ vật liệu tự nhiên. Màu nền trung tính ấm áp (cát, travertine, greige), duy nhất một màu bão hòa từ xanh lá nhiệt đới; điểm nhấn mùa hoa (tím, vàng, trắng).

**Cây trồng (8 loài, 40% diện tích):**
- Tán cao: Bằng lăng + Muồng hoàng yến (W/SW, cao 10-12m, chặn nắng chiều, >5m khỏi móng)
- Leo giàn: Hoa giấy cát + Nhài (hương thơm buổi tối)
- Tầng thấp: Dianella (5 cây), Agave (3 cây), Sả (7 cây, đuổi muỗi), Hoa đại (điểm nhấn)
- Ba tầng lá: tán/trung/mặt đất; nhóm số lẻ; bốn trạng thái mùa (khô mát/khô nóng/mưa đầu/mưa cao điểm)

**Mặt cứng (60%):**
- Pergola 4x5m, cột 2.7m, mái nan ~40% hở (nhôm vân gỗ, không mối mọt), hướng nan tính từ quỹ đạo mặt trời → ~60% bóng lúc 14h
- Gạch porcelain 600x1200mm, vân travertine, chống trơn R11, độ dốc 1-2%
- Sỏi granite 10mm + viền thép; lối đi 1.2m; cổng giàn 1.2x2.4m khung thép mảnh; tường/màn gỗ/hàng rào 1.8-2.2m

**Ánh sáng (2700K, CRI 90+, IP65+, không chói, thân thiện bầu trời đêm):**
- Chiếu ngược cây, rọi tường kết cấu, led dải ẩn dưới ghế + xà pergola, đèn lối đi thấp
- Ba chế độ: day (tắt) / dusk (dải + wall-graze) / night (uplight + path)

**Nước:** Bể phản chiếu nông 1.2x3m, max 0.4m sâu; luôn tuần hoàn hoặc kiểm soát muỗi (Bti)

**Bảo trì:** Tỉa cành hàng năm, cọ rơm hàng tuần (mùa khô mát), kiểm tra mối/đường ống/bơm theo lịch`
};
