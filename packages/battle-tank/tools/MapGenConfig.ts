/**
 * Configuration for LLM-based map generation.
 * Includes strategic category targets, theme presets, environment conditions,
 * terrain compatibility rules, and theme enforcement thresholds.
 */

export type ThemeName = 'north_africa' | 'eastern_front' | 'pacific' | 'urban' | 'mediterranean' | 'western_front' | 'mixed';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CategoryTarget {
  min: number;  // % of walkable cells
  max: number;
  priority: 'high' | 'medium' | 'low';
}

export interface Landmark {
  id: string;
  label: string;
  /** How to compose from existing terrain+object symbols (guides mockup LLM). */
  composition: string;
  /** Visual description for image prompt. */
  imageHint: string;
}

export interface ThemePreset {
  name: ThemeName;
  description: string;
  terrainSymbols: string[];              // Preferred terrain symbols
  forbiddenSymbols?: string[];            // Never use (terrain)
  objectSymbols: string[];               // Preferred object symbols
  forbiddenObjectSymbols?: string[];      // Never use (object)
  categoryTargets: Record<string, CategoryTarget>;
  landmarks: Landmark[];
}

export interface TimeOfDayPreset {
  name: TimeOfDay;
  description: string;
  lighting: string;
  palette: string;
}

export interface SeasonPreset {
  name: Season;
  description: string;
  atmosphere: string;
  surfaceEffects: string;
}

export const MAP_GEN_CONFIG = {
  llm: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001', // 'claude-sonnet-4-5-20250929'
    temperature: 0.7,
    maxTokens: 8000,
  },
  validation: {
    /** Minimum % of walkable cells (excludes walls, blocks, etc). */
    minWalkablePercent: 0.4,
    /** Maximum % of cells with blocking objects. */
    maxObjectDensity: 0.3,
    /** Ensure all enemy spawns are reachable from player spawn. */
    requireSpawnConnectivity: true,
  },
  design: {
    /** Minimum cells between player and enemy spawns. */
    minSpawnDistance: 8,
    /** Target % of walkable cells adjacent to cover (containers, walls). */
    targetCoverDensity: 0.35,
    /** Max unique ground terrain types per map (grass, water, sand, etc). */
    maxTerrainVariety: 5,
    /** Ideal walkable % (for designer feedback, not hard constraint). */
    preferredWalkablePercent: 0.55,

    /** Category-based density targets (% of map). */
    categoryTargets: {
      MOBILITY: { min: 0.15, max: 0.35, priority: 'medium' },
      DEFENSIVE: { min: 0.15, max: 0.35, priority: 'medium' },
      HAZARD: { min: 0.02, max: 0.12, priority: 'low' },
      OPEN: { min: 0.25, max: 0.45, priority: 'high' },
      TRANSITION: { min: 0.08, max: 0.25, priority: 'medium' },
    } as Record<string, CategoryTarget>,
  },

  /** Map grid sizing constraints and defaults. */
  mapSizing: {
    /** Default map dimensions if not specified via CLI. */
    default: { rows: 20, cols: 20 },
    /** Enforce square maps (rows === cols). */
    enforceSquare: true,
    /** Minimum grid dimension (both rows and cols). */
    minSize: 8,
    /** Maximum grid dimension (both rows and cols). */
    maxSize: 40,
  },

  /** Theme enforcement: how strictly to enforce preferred/forbidden lists. */
  themeEnforcement: {
    /** Max non-preferred terrain types allowed (soft limit, produces warning). */
    maxNonPreferredTerrains: 2,
    /** Max non-preferred object types allowed (soft limit, produces warning). */
    maxNonPreferredObjects: 1,
  },

  /** Theme presets guide coherent map generation. */
  themes: {
    north_africa: {
      name: 'north_africa',
      description: 'Desert warfare: sand, hardpan, salt flats, rocky outcrops',
      terrainSymbols: ['.', 'P', 'S', 'O', 'D', 'V'],
      forbiddenSymbols: ['f', 'j', 'n', 'i'],
      objectSymbols: ['R', '~', 'E', 'Y', 'F', '_', 'C', 's'],
      forbiddenObjectSymbols: ['I', 'Z', 'M', 'K'],
      categoryTargets: {
        MOBILITY: { min: 0.25, max: 0.35, priority: 'high' },
        DEFENSIVE: { min: 0.15, max: 0.25, priority: 'medium' },
        HAZARD: { min: 0.02, max: 0.08, priority: 'low' },
        OPEN: { min: 0.30, max: 0.40, priority: 'high' },
        TRANSITION: { min: 0.10, max: 0.15, priority: 'medium' },
      },
      landmarks: [
        { id: 'pyramid_complex', label: 'Pyramids of Giza', composition: 'Triangular cluster of dune_slope (D) cells forming elevated pyramidal shapes on hardpan (P) base, surrounded by loose_sand (.)', imageHint: 'Ancient stone pyramids rising from desert floor, casting long geometric shadows across sand' },
        { id: 'tobruk_fortress', label: 'Tobruk Fortress Ruins', composition: 'Rectangular ring of fortification_wall (F) and concrete_barrier (_) enclosing hardpan (P) courtyard with boulder_formation (R) rubble', imageHint: 'Crumbling Italian colonial fortress walls with breached sections and rubble-filled courtyard' },
        { id: 'desert_oasis', label: 'Desert Oasis', composition: 'Central oasis_turf (V) cluster with water (w) pocket, ringed by scrub_vegetation (O) transitioning to loose_sand (.)', imageHint: 'Palm-fringed freshwater oasis with green vegetation island amid endless desert' },
        { id: 'el_alamein_railway', label: 'El Alamein Railway Halt', composition: 'Straight dirt_road (r) corridor with shipping_container (C) clusters and barrel formations on both sides, salt_flat (S) surrounds', imageHint: 'Desert railway stop with supply crates, fuel drums, and a single track cutting through flat terrain' },
        { id: 'desert_airstrip', label: 'Desert Landing Strip', composition: 'Long salt_flat (S) runway flanked by barrel clusters (s) and sandbag_wall (~) revetments on hardpan (P)', imageHint: 'Flat desert airstrip marked with oil drums, sand-scraped landing surface, scattered supply points' },
        { id: 'ancient_ruins', label: 'Pharaonic Column Ruins', composition: 'Scattered boulder_formation (R) in grid pattern on rocky_outcrop (O) base, with loose_sand (.) between columns', imageHint: 'Weathered ancient Egyptian stone columns and fallen masonry half-buried in desert sand' },
        { id: 'desert_fort', label: 'Beau Geste Desert Fort', composition: 'Square perimeter of water_wall (W) with fortification_wall (F) corners, inner hardpan (P) parade ground, single gap entrance', imageHint: 'Classic French Foreign Legion square desert fort with crenellated walls and corner towers' },
        { id: 'minefield_corridor', label: "Devil's Gardens Minefield", composition: 'Narrow hardpan (P) lane between parallel strips of muddy_sinkhole (;) hazard terrain, boulder_formation (R) markers at entry', imageHint: 'Marked safe passage through barren minefield with warning stakes and disturbed sand patterns' },
      ],
    },
    eastern_front: {
      name: 'eastern_front',
      description: 'Steppe/winter warfare: snow, forest, gravel, grass',
      terrainSymbols: ['n', 'i', 'f', 'G', ',', '^'],
      forbiddenSymbols: ['S', 'D', 'b', 'w'],
      objectSymbols: ['I', 'Z', 'M', '#', 'W', 'p', 'F', '_', 'B', 's'],
      forbiddenObjectSymbols: ['~', 'Y', 'E'],
      categoryTargets: {
        MOBILITY: { min: 0.15, max: 0.25, priority: 'medium' },
        DEFENSIVE: { min: 0.25, max: 0.35, priority: 'high' },
        HAZARD: { min: 0.05, max: 0.12, priority: 'medium' },
        OPEN: { min: 0.20, max: 0.30, priority: 'medium' },
        TRANSITION: { min: 0.15, max: 0.25, priority: 'high' },
      },
      landmarks: [
        { id: 'stalingrad_factory', label: 'Tractor Factory Ruins', composition: 'Large irregular cluster of iron_fence (#) and fortification_wall (F) on gravel (,) with concrete_barrier (_) rubble, ice_snow_field (i) surrounds', imageHint: 'Bombed-out Soviet industrial complex with collapsed roof trusses, shattered concrete walls, and twisted machinery' },
        { id: 'frozen_lake_crossing', label: 'Frozen Lake Crossing', composition: 'Central ice_snow_field (i) expanse with deep_snow (n) banks, narrow gravel (,) path across, hilly_ground (^) shores', imageHint: 'Frozen lake surface with cracked ice patterns, snow-covered banks, and a precarious crossing route' },
        { id: 'orthodox_church', label: 'Ruined Orthodox Church', composition: 'Compact cluster of water_wall (W) forming church outline on grass_plains (G), boulder_formation (R) rubble inside, forest_floor (f) surrounds', imageHint: 'Shattered onion-dome Orthodox church with collapsed bell tower, stone walls scarred by artillery' },
        { id: 'kursk_trenches', label: 'Kursk Defense Trenches', composition: 'Parallel lines of depression (-) with sandbag_wall (p) parapets on grass_plains (G), connecting zigzag paths of gravel (,)', imageHint: 'Deep anti-tank trench system with earthen berms, firing steps, and communication trenches' },
        { id: 'destroyed_village', label: 'Burned Village Hamlet', composition: 'Scattered iron_fence (#) and wooden debris (B) clusters on forest_floor (f), grass_plains (G) clearings between', imageHint: 'Charred remains of wooden village houses, collapsed roofs, scorched gardens, and abandoned wells' },
        { id: 'rail_junction', label: 'Rail Junction Depot', composition: 'Straight gravel (,) corridor with shipping_container (C) rows, iron_fence (#) fencing, concrete_barrier (_) platforms on both sides', imageHint: 'Snow-dusted rail depot with derailed freight cars, signal tower, and supply crates on platforms' },
        { id: 'partisan_camp', label: 'Partisan Forest Camp', composition: 'Forest_floor (f) clearing ringed by dense forest_floor (f), scattered barrel (s) and wooden debris (B), concealed by tree_stump (Z)', imageHint: 'Hidden woodland guerrilla camp with lean-to shelters, campfire remnants, and camouflaged supply caches' },
        { id: 'grain_elevator', label: 'Stalingrad Grain Elevator', composition: 'Tall central metal_wall (M) block flanked by concrete_barrier (_) on gravel (,), fortification_wall (F) defensive ring', imageHint: 'Towering concrete grain elevator scarred by shell impacts, windows blown out, iconic Stalingrad strongpoint' },
      ],
    },
    pacific: {
      name: 'pacific',
      description: 'Jungle/island warfare: jungle, beach, marsh, vegetation',
      terrainSymbols: ['j', 'b', ';', 'V', 'w', 'T'],
      forbiddenSymbols: ['n', 'i', 'r', 'A'],
      objectSymbols: ['W', 'X', 'K', 'R', '/', 's', 'B'],
      forbiddenObjectSymbols: ['I', 'Z', 'M', '~'],
      categoryTargets: {
        MOBILITY: { min: 0.08, max: 0.18, priority: 'low' },
        DEFENSIVE: { min: 0.35, max: 0.45, priority: 'high' },
        HAZARD: { min: 0.08, max: 0.15, priority: 'medium' },
        OPEN: { min: 0.15, max: 0.25, priority: 'low' },
        TRANSITION: { min: 0.10, max: 0.20, priority: 'medium' },
      },
      landmarks: [
        { id: 'beach_landing', label: 'Tarawa Beach Landing Zone', composition: 'Beach_sand (b) strip with water_wall (W) seawall, scattered boulder_formation (R) obstacles, shoreline (T) transition to jungle_underbrush (j)', imageHint: 'Contested Pacific beach with concrete anti-landing obstacles, shattered palm trees, and shell craters in sand' },
        { id: 'jungle_temple', label: 'Overgrown Jungle Temple', composition: 'Central boulder_formation (R) and cliff_face (X) cluster on oasis_turf (V), jungle_underbrush (j) encroaching from all sides', imageHint: 'Ancient stone temple ruins swallowed by jungle vines, moss-covered carved walls, collapsed stone archways' },
        { id: 'volcanic_ridge', label: 'Suribachi Volcanic Ridge', composition: 'Elevated hilly_ground (^) ridge with cliff_face (X) faces, rocky debris (K) scattered on slopes, scrub_vegetation (V) in crevices', imageHint: 'Dark volcanic ridgeline with jagged rock formations, sulfur-stained vents, and steep barren slopes' },
        { id: 'coastal_guns', label: 'Coastal Gun Emplacement', composition: 'Fortification_wall (F) bunker on cliff_face (X) overlooking beach_sand (b), concrete_barrier (_) blast walls, barrel (s) ammo stores', imageHint: 'Japanese coastal defense bunker with heavy gun mount, reinforced concrete walls, camouflage netting remnants' },
        { id: 'airfield_wreckage', label: 'Destroyed Airfield', composition: 'Flat beach_sand (b) runway with scattered wooden_debris (B) and barrel (s) clusters, crater-like marsh_swamp (;) holes', imageHint: 'Bombed-out island airstrip with wrecked aircraft hulks, cratered runway, and burned fuel storage' },
        { id: 'river_ford', label: 'Jungle River Crossing', composition: 'Water (w) channel cutting through jungle_underbrush (j), shallow shoreline (T) ford points, boulder_formation (R) stepping stones', imageHint: 'Murky jungle river with overhanging canopy, fallen log bridges, and muddy fording points' },
        { id: 'cave_network', label: 'Hillside Cave Positions', composition: 'Cliff_face (X) with dark recesses on hilly_ground (^), rocky debris (K) berms at entrances, jungle_underbrush (j) concealment', imageHint: 'Honeycomb of defensive cave openings carved into volcanic hillside, sandbagged firing positions at each mouth' },
        { id: 'coral_shore', label: 'Coral Reef Shoreline', composition: 'Irregular shoreline (T) with rocky debris (K) reef formations in shallow water (w), beach_sand (b) pockets between', imageHint: 'Jagged coral formations breaking the surf line, tide pools between reef plates, treacherous shallow approach' },
      ],
    },
    urban: {
      name: 'urban',
      description: 'Urban combat: asphalt, concrete, ruins, urban pavement',
      terrainSymbols: ['A', 'u', 'r', 'c'],
      forbiddenSymbols: ['.', 'D', 'n', 'i', 'j'],
      objectSymbols: ['F', 'C', '_', 'p', 'Q', '#', 'B', 'c', 's'],
      forbiddenObjectSymbols: ['~', 'Y', 'I', 'M', 'K', '/'],
      categoryTargets: {
        MOBILITY: { min: 0.20, max: 0.40, priority: 'high' },
        DEFENSIVE: { min: 0.15, max: 0.25, priority: 'medium' },
        HAZARD: { min: 0.02, max: 0.08, priority: 'low' },
        OPEN: { min: 0.10, max: 0.20, priority: 'low' },
        TRANSITION: { min: 0.10, max: 0.20, priority: 'medium' },
      },
      landmarks: [
        { id: 'bombed_cathedral', label: 'Bombed Gothic Cathedral', composition: 'Large fortification_wall (F) outline with concrete_barrier (_) rubble interior on urban_pavement (u), wooden_debris (B) collapsed roof', imageHint: 'Shattered Gothic cathedral with collapsed nave, shrapnel-scarred stone walls, and a toppled bell tower' },
        { id: 'factory_complex', label: 'Industrial Factory District', composition: 'Cluster of iron_fence (#) perimeter with oil_derrick (Q) interior, concrete_barrier (_) loading docks, asphalt (A) yard', imageHint: 'Bombed industrial complex with smokestacks, shattered factory windows, twisted girders, and rubble-strewn yards' },
        { id: 'town_square', label: 'Central Town Square', composition: 'Open urban_pavement (u) plaza ringed by fortification_wall (F) building facades, concrete_barrier (_) fountain base at center', imageHint: 'War-torn town square with cracked cobblestones, destroyed fountain, and bullet-pocked surrounding buildings' },
        { id: 'rail_yard', label: 'Railway Marshaling Yard', composition: 'Parallel dirt_road (r) tracks with shipping_container (C) rows, iron_fence (#) rail switches, barrel (s) fuel points', imageHint: 'Devastated rail yard with overturned freight cars, tangled rail lines, and burning coal wagons' },
        { id: 'apartment_ruins', label: 'Residential Block Ruins', composition: 'Grid of fortification_wall (F) walls with wooden_debris (B) fill on concrete (c), sandbag_wall (p) improvised fighting positions', imageHint: 'Skeletal apartment blocks with floors exposed, furniture dangling from edges, rubble cascading into streets' },
        { id: 'market_street', label: 'Ruined Market Street', composition: 'Narrow asphalt (A) lane flanked by shipping_container (C) stalls and wooden_debris (B), concrete_barrier (_) barricades', imageHint: 'Destroyed commercial street with collapsed shop awnings, scattered merchandise, and makeshift barricades' },
        { id: 'canal_bridge', label: 'Urban Canal Bridge', composition: 'Concrete_barrier (_) bridge spanning muddy_sinkhole (;) canal, fortification_wall (F) bridge towers, asphalt (A) approach roads', imageHint: 'Damaged stone bridge over urban canal, cracked arches, sandbag positions on both approaches' },
        { id: 'government_building', label: 'Administrative HQ Ruins', composition: 'Large fortification_wall (F) rectangular outline with concrete (c) interior, sandbag_wall (p) defensive ring, iron_fence (#) perimeter', imageHint: 'Neoclassical government building with collapsed portico columns, shell-cratered facade, and rooftop observation post' },
      ],
    },
    mediterranean: {
      name: 'mediterranean',
      description: 'Mountain/Italian Campaign: cliffs, valleys, ridges, hill slopes (Monte Cassino, Gothic Line, Sicily)',
      terrainSymbols: ['^', 'h', 'c', '/', '\\', 'G', '+', 'O', '-'],
      forbiddenSymbols: ['n', 'i', 'b', ';', 'S'],
      objectSymbols: ['X', 'R', 'Y', '/', 'K', 'F', '_', 's'],
      forbiddenObjectSymbols: ['I', 'Z', 'M', 'Q'],
      categoryTargets: {
        MOBILITY: { min: 0.10, max: 0.20, priority: 'low' },
        DEFENSIVE: { min: 0.25, max: 0.40, priority: 'high' },
        HAZARD: { min: 0.03, max: 0.10, priority: 'low' },
        OPEN: { min: 0.15, max: 0.25, priority: 'medium' },
        TRANSITION: { min: 0.20, max: 0.35, priority: 'high' },
      },
      landmarks: [
        { id: 'hilltop_monastery', label: 'Monte Cassino Monastery', composition: 'Elevated hilly_ground (^) with fortification_wall (F) rectangular complex at summit, cliff_face (X) approaches, hill_slope (h) terraces', imageHint: 'Massive hilltop abbey with thick stone walls, bombed courtyards, commanding view over valley approaches' },
        { id: 'stone_bridge', label: 'Roman Stone Bridge', composition: 'Concrete_barrier (_) bridge spanning canyon_floor (c) or rapids_drop (w), boulder_formation (R) abutments, saddle_pass (+) approaches', imageHint: 'Ancient Roman stone arch bridge over mountain gorge, weathered masonry, narrow single-lane crossing' },
        { id: 'ancient_amphitheater', label: 'Roman Amphitheater Ruins', composition: 'Semicircular hill_slope (h) tiers around central valley_floor (O) arena, boulder_formation (R) and cliff_face (X) seating walls', imageHint: 'Ruined Roman amphitheater carved into hillside, crumbling stone seating tiers, overgrown arena floor' },
        { id: 'terraced_vineyard', label: 'Hillside Vineyard Terraces', composition: 'Stepped hill_slope (h) terraces with scrub_vegetation (V) rows, retaining cliff_face (X) walls, grass_plains (G) between levels', imageHint: 'Abandoned terraced vineyard on steep hillside, stone retaining walls, withered vine rows, irrigation channels' },
        { id: 'coastal_watchtower', label: 'Medieval Watchtower', composition: 'Central boulder_formation (R) tower on ridge_crest (-) promontory, fortification_wall (F) base wall, rocky_outcrop (O) surrounds', imageHint: 'Crumbling medieval stone watchtower on coastal cliff, narrow staircase, panoramic observation point' },
        { id: 'mountain_pass', label: 'Mountain Gorge Road', composition: 'Narrow saddle_pass (+) corridor between cliff_face (X) walls, rocky_debris (K) rockfall hazards, hilly_ground (^) above', imageHint: 'Narrow mountain road carved through steep gorge, switchback turns, rockfall debris, sheer cliff walls' },
        { id: 'harbor_ruins', label: 'Bombed Fishing Harbor', composition: 'Shoreline (T) waterfront with concrete_barrier (_) piers, fortification_wall (F) warehouse shells, barrel (s) on valley_floor (O)', imageHint: 'Destroyed Mediterranean fishing port with sunken boats, crumbled stone quay, and shattered waterfront buildings' },
        { id: 'roman_aqueduct', label: 'Ancient Aqueduct Remains', composition: 'Line of boulder_formation (R) pillars spanning valley_floor (O), cliff_face (X) arch fragments, grass_plains (G) beneath', imageHint: 'Towering Roman aqueduct arches marching across valley, some collapsed into rubble, others still standing' },
      ],
    },
    western_front: {
      name: 'western_front',
      description: 'Normandy/Ardennes: beaches, farmland, forests, roads, river crossings (D-Day, Bulge, Rhine)',
      terrainSymbols: [',', 'f', 'b', 'r', 'G', '^', 'w', '-'],
      forbiddenSymbols: ['.', 'S', 'D', 'n', 'i', 'j'],
      objectSymbols: ['W', 'F', 'C', '_', 'p', 'R', 'B', 's', '#'],
      forbiddenObjectSymbols: ['~', 'Y', 'I', 'Z', 'M', 'K', '/'],
      categoryTargets: {
        MOBILITY: { min: 0.20, max: 0.30, priority: 'high' },
        DEFENSIVE: { min: 0.20, max: 0.30, priority: 'medium' },
        HAZARD: { min: 0.02, max: 0.08, priority: 'low' },
        OPEN: { min: 0.20, max: 0.30, priority: 'medium' },
        TRANSITION: { min: 0.15, max: 0.25, priority: 'high' },
      },
      landmarks: [
        { id: 'atlantic_wall', label: 'Atlantic Wall Bunker Line', composition: 'Row of fortification_wall (F) and concrete_barrier (_) bunkers on beach_sand (b) backed by hilly_ground (^), sandbag_wall (p) connecting trenches', imageHint: 'Massive concrete bunker line with gun slits overlooking beach, anti-tank obstacles in surf, barbed wire entanglements' },
        { id: 'bocage_hedgerow', label: 'Normandy Bocage Maze', composition: 'Grid of water_wall (W) hedgerow lines enclosing grass_plains (G) fields, narrow gravel (,) lanes between, boulder_formation (R) gate gaps', imageHint: 'Dense Norman hedgerow maze with ancient earthen banks topped by thick brush, narrow sunken lanes between fields' },
        { id: 'church_crossroads', label: 'Village Church Crossroads', composition: 'Central fortification_wall (F) church building at dirt_road (r) intersection, wooden_debris (B) surrounding houses, gravel (,) square', imageHint: 'Norman stone church at village crossroads with damaged steeple, cobbled square, and rubble from adjacent houses' },
        { id: 'river_bridge', label: 'Remagen-style River Bridge', composition: 'Concrete_barrier (_) bridge spanning water (w) river, fortification_wall (F) bridge towers, dirt_road (r) approaches on both banks', imageHint: 'Steel truss bridge over wide river, damaged but standing, defensive positions on both approaches, pontoon backup nearby' },
        { id: 'farmstead', label: 'Norman Farmhouse Compound', composition: 'Rectangular iron_fence (#) enclosure with wooden_debris (B) farmhouse, barrel (s) in grass_plains (G) yard, water_wall (W) hedgerow border', imageHint: 'Stone Norman farmhouse with walled courtyard, damaged barn, apple orchard, and defensive hedgerow perimeter' },
        { id: 'sunken_lane', label: 'Sunken Road Between Banks', composition: 'Depressed dirt_road (r) corridor below hilly_ground (^) embankments on both sides, forest_floor (f) canopy cover', imageHint: 'Deep sunken road worn below field level, high earth banks with exposed roots, natural infantry corridor' },
        { id: 'supply_depot', label: 'Allied Forward Supply Base', composition: 'Cluster of shipping_container (C) and barrel (s) on gravel (,) hardstand, iron_fence (#) perimeter, dirt_road (r) access', imageHint: 'Field supply depot with stacked crate rows, fuel drum pyramids, camouflage netting, and truck tire ruts' },
        { id: 'flooded_polder', label: 'Flooded Lowland Polder', composition: 'Marsh_swamp (;) expanse with narrow gravel (,) dike paths, water (w) flooded fields, scattered wooden_debris (B) farmhouse ruins', imageHint: 'Deliberately flooded Dutch polder with submerged fields, only raised dike roads passable, isolated farm ruins as islands' },
      ],
    },
    mixed: {
      name: 'mixed',
      description: 'Varied terrain: no theme restrictions, balanced categories',
      terrainSymbols: [],  // All symbols allowed
      forbiddenSymbols: [],
      objectSymbols: [],   // All symbols allowed
      forbiddenObjectSymbols: [],
      categoryTargets: {
        MOBILITY: { min: 0.15, max: 0.35, priority: 'medium' },
        DEFENSIVE: { min: 0.15, max: 0.35, priority: 'medium' },
        HAZARD: { min: 0.02, max: 0.12, priority: 'low' },
        OPEN: { min: 0.25, max: 0.45, priority: 'high' },
        TRANSITION: { min: 0.08, max: 0.25, priority: 'medium' },
      },
      landmarks: [],  // All theme landmarks accessible via explicit --landmark
    },
  } as Record<ThemeName, ThemePreset>,

  /** Environment conditions: time of day presets. */
  timeOfDay: {
    dawn: {
      name: 'dawn',
      description: 'Early morning, low sun',
      lighting: 'Low orange sun on horizon, long shadows stretching east-to-west, thin ground mist, warm golden-pink horizon glow',
      palette: 'Warm amber highlights, cool blue shadows, soft diffused light, muted saturation',
    },
    day: {
      name: 'day',
      description: 'Full daylight, clear skies',
      lighting: 'Natural daylight, 45° sun angle, soft shadows, full illumination',
      palette: 'Full color saturation, neutral whites, natural earth tones, crisp contrast',
    },
    dusk: {
      name: 'dusk',
      description: 'Golden hour, setting sun',
      lighting: 'Golden hour glow, red-orange sun low on horizon, long shadows west-to-east, warm silhouettes against sky',
      palette: 'Deep orange and amber tones, purple shadow edges, reduced saturation in distance, warm color cast',
    },
    night: {
      name: 'night',
      description: 'Moonlit darkness, limited visibility',
      lighting: 'Cool moonlight/starlight, harsh high-contrast shadows, scattered artificial light pools from fires or flares',
      palette: 'Blue-silver desaturated tones, deep blacks, isolated warm spots from fires, low overall brightness',
    },
  } as Record<TimeOfDay, TimeOfDayPreset>,

  /** Environment conditions: season presets. */
  seasons: {
    spring: {
      name: 'spring',
      description: 'Fresh growth, wet ground',
      atmosphere: 'Soft overcast light, occasional rain puddles, fresh budding foliage, mild humidity haze',
      surfaceEffects: 'Mud patches from recent rain, green shoots in soil cracks, damp reflective surfaces, puddles in depressions',
    },
    summer: {
      name: 'summer',
      description: 'Peak heat, dry conditions',
      atmosphere: 'Bright harsh sunlight, heat shimmer on distant surfaces, dust haze, high contrast',
      surfaceEffects: 'Dry cracked earth, sun-bleached surfaces, dust clouds, dried vegetation, heat distortion',
    },
    autumn: {
      name: 'autumn',
      description: 'Cooling, deciduous change',
      atmosphere: 'Soft diffused light through thin overcast, golden-hour quality throughout day, slight fog',
      surfaceEffects: 'Orange-brown fallen leaves, damp soil, muted green-to-brown vegetation, overcast reflections',
    },
    winter: {
      name: 'winter',
      description: 'Cold, snow and frost',
      atmosphere: 'Grey overcast skies, flat diffused light, breath-fog visibility, cold blue ambient tone',
      surfaceEffects: 'Snow dusting on horizontal surfaces, frost on metal, ice patches, bare tree silhouettes, frozen puddles',
    },
  } as Record<Season, SeasonPreset>,

  /** Terrain adjacency rules: prevent incompatible neighbors. */
  incompatibilities: {
    // Water variants should not touch each other excessively
    'rapids_drop': ['deep_snow', 'marsh_swamp'],
    'shoreline': ['deep_snow', 'ice_snow_field'],
    // Hazards sparse
    'deep_snow': ['rapids_drop', 'marsh_swamp', 'muddy_sinkhole'],
    'marsh_swamp': ['deep_snow', 'rapids_drop', 'ice_snow_field'],
    // Snow only in polar contexts
    'ice_snow_field': ['shoreline', 'jungle_underbrush', 'beach_sand'],
  } as Record<string, string[]>,

  /** Vision LLM config for image → mockup extraction. */
  vision: {
    provider: 'google' as const,
    model: 'gemini-2.5-pro',
    /** Max output tokens for vision extraction. Increased for large grids (40×20 = ~2000 tokens for grid + JSON). */
    maxTokens: 16000,
    /** Low temperature for precise grid extraction. */
    temperature: 0.3,
  },

  output: {
    /** Directory for generated maps (relative to tools/). */
    outputDir: 'generated-maps',
    /** Maximum filename length for generated maps. */
    maxFilenameLength: 30,
  },
  /** Landmark auto-selection config. */
  landmarks: {
    /** Min landmarks to auto-pick when --landmark auto is used. */
    autoPickMin: 1,
    /** Max landmarks to auto-pick when --landmark auto is used. */
    autoPickMax: 3,
  },

  logging: {
    /** Enable verbose step-by-step logging. */
    verbose: true,
  },
} as const;
