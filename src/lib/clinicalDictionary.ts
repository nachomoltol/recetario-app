/**
 * DICCIONARIO CLÍNICO DE EXCLUSIONES Y MOTOR DE RIGOR CLÍNICO
 * Define el catálogo canónico de alérgenos UE (Reglamento UE 1169/2011),
 * protocolos clínicos patológicos, directivas de seguridad y patrones alimentarios.
 * Proporciona soporte bilingüe (ES / EN) y diferenciación de severidad clínica.
 */

export type SeveridadClinica = 'critica' | 'moderada';

// =============================================================================
// 1. CATÁLOGO OFICIAL DE LOS 14 ALÉRGENOS UE (Reglamento UE 1169/2011)
// =============================================================================

export interface AlergenoUE {
  id: string;
  nombre: { es: string; en: string };
  sinonimos: string[];
  severidad: 'critica';
  exclusiones: { es: string[]; en: string[] };
}

export const ALERGENOS_UE: AlergenoUE[] = [
  {
    id: 'gluten',
    nombre: {
      es: 'Cereales con gluten (trigo, centeno, cebada, avena)',
      en: 'Cereals containing gluten (wheat, rye, barley, oats)',
    },
    sinonimos: [
      'gluten',
      'trigo',
      'cebada',
      'centeno',
      'avena',
      'espelta',
      'kamut',
      'triticale',
      'celiaquia',
      'celiaco',
      'celíaco',
      'celiac',
      'wheat',
      'barley',
      'rye',
      'spelt',
      'oats',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'trigo',
        'cebada',
        'centeno',
        'espelta',
        'kamut',
        'triticale',
        'avena no certificada',
        'harina de trigo',
        'pan con gluten',
        'pasta de trigo',
        'salsa de soja convencional',
        'cerveza convencional',
        'cuscús',
        'sémola de trigo',
      ],
      en: [
        'wheat',
        'barley',
        'rye',
        'spelt',
        'kamut',
        'triticale',
        'non-certified oats',
        'wheat flour',
        'wheat bread',
        'wheat pasta',
        'conventional soy sauce',
        'conventional beer',
        'couscous',
        'wheat semolina',
      ],
    },
  },
  {
    id: 'crustaceos',
    nombre: {
      es: 'Crustáceos y derivados',
      en: 'Crustaceans and products thereof',
    },
    sinonimos: [
      'crustaceos',
      'crustáceos',
      'crustaceo',
      'crustáceo',
      'marisco',
      'mariscos',
      'gamba',
      'gambas',
      'langostino',
      'langostinos',
      'cangrejo',
      'cangrejos',
      'bogavante',
      'langosta',
      'camaron',
      'camarones',
      'camarón',
      'cigalas',
      'crustaceans',
      'shellfish',
      'shrimp',
      'prawns',
      'crab',
      'lobster',
      'crayfish',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'gambas',
        'langostinos',
        'camarones',
        'cangrejo',
        'bogavante',
        'langosta',
        'cigalas',
        'nécoras',
        'pasta de gambas',
      ],
      en: [
        'shrimp',
        'prawns',
        'crab',
        'lobster',
        'crayfish',
        'crawfish',
        'scampi',
        'shrimp paste',
      ],
    },
  },
  {
    id: 'huevos',
    nombre: {
      es: 'Huevos y productos a base de huevo',
      en: 'Eggs and products thereof',
    },
    sinonimos: [
      'huevo',
      'huevos',
      'clara de huevo',
      'yema de huevo',
      'mayonesa',
      'ovoproductos',
      'albúmina',
      'albumina',
      'egg',
      'eggs',
      'egg white',
      'egg yolk',
      'mayonnaise',
      'albumin',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'huevo',
        'huevos',
        'clara de huevo',
        'yema de huevo',
        'mayonesa',
        'merengue',
        'ovoproductos',
        'albúmina de huevo',
      ],
      en: [
        'egg',
        'eggs',
        'egg white',
        'egg yolk',
        'mayonnaise',
        'meringue',
        'egg albumin',
        'egg powder',
      ],
    },
  },
  {
    id: 'pescado',
    nombre: {
      es: 'Pescado y productos a base de pescado',
      en: 'Fish and products thereof',
    },
    sinonimos: [
      'pescado',
      'pescados',
      'atun',
      'atún',
      'salmon',
      'salmón',
      'merluza',
      'bacalao',
      'anchoas',
      'sardinas',
      'lubina',
      'dorada',
      'fish',
      'tuna',
      'salmon',
      'cod',
      'anchovies',
      'sardines',
      'hake',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'pescado',
        'atún',
        'salmón',
        'merluza',
        'bacalao',
        'anchoas',
        'sardinas',
        'lubina',
        'dorada',
        'salsa de pescado',
        'caldo de pescado',
      ],
      en: [
        'fish',
        'tuna',
        'salmon',
        'hake',
        'cod',
        'anchovies',
        'sardines',
        'sea bass',
        'fish sauce',
        'fish stock',
      ],
    },
  },
  {
    id: 'cacahuetes',
    nombre: {
      es: 'Cacahuetes y derivados',
      en: 'Peanuts and products thereof',
    },
    sinonimos: [
      'cacahuete',
      'cacahuetes',
      'mani',
      'maní',
      'manies',
      'maníes',
      'mantequilla de cacahuete',
      'crema de cacahuete',
      'peanut',
      'peanuts',
      'peanut butter',
      'groundnuts',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'cacahuetes',
        'cacahuete',
        'maní',
        'mantequilla de cacahuete',
        'aceite de cacahuete',
        'harina de cacahuete',
      ],
      en: [
        'peanuts',
        'peanut',
        'peanut butter',
        'peanut oil',
        'peanut flour',
        'groundnuts',
      ],
    },
  },
  {
    id: 'soja',
    nombre: {
      es: 'Soja y productos a base de soja',
      en: 'Soybeans and products thereof',
    },
    sinonimos: [
      'soja',
      'soya',
      'tofu',
      'tempeh',
      'edamame',
      'salsa de soja',
      'lecitina de soja',
      'miso',
      'soy',
      'soya',
      'soy sauce',
      'soy lecithin',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'soja',
        'salsa de soja',
        'tofu',
        'tempeh',
        'edamame',
        'lecitina de soja',
        'bebida de soja',
        'miso',
        'harina de soja',
      ],
      en: [
        'soy',
        'soybeans',
        'soy sauce',
        'tofu',
        'tempeh',
        'edamame',
        'soy milk',
        'soy lecithin',
        'miso',
        'soy flour',
      ],
    },
  },
  {
    id: 'lacteos',
    nombre: {
      es: 'Leche y lácteos (incluida lactosa)',
      en: 'Milk and dairy products (including lactose)',
    },
    sinonimos: [
      'lacteos',
      'lácteos',
      'lacteo',
      'lácteo',
      'leche',
      'queso',
      'quesos',
      'yogur',
      'mantequilla',
      'nata',
      'lactosa',
      'suero de leche',
      'caseina',
      'caseína',
      'dairy',
      'milk',
      'cheese',
      'butter',
      'cream',
      'yogurt',
      'lactose',
      'whey',
      'casein',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'leche',
        'leche de vaca',
        'leche evaporada',
        'leche condensada',
        'leche entera',
        'leche desnatada',
        'leche semidesnatada',
        'leche de cabra',
        'leche de oveja',
        'queso',
        'quesos',
        'queso fresco',
        'queso crema',
        'ricotta',
        'mascarpone',
        'yogur',
        'yogurt',
        'mantequilla',
        'nata',
        'nata para cocinar',
        'crema de leche',
        'suero de leche',
        'lactosa',
        'caseína',
      ],
      en: [
        'milk',
        'cow milk',
        'evaporated milk',
        'condensed milk',
        'whole milk',
        'skim milk',
        'goat milk',
        'sheep milk',
        'cheese',
        'cheeses',
        'fresh cheese',
        'cream cheese',
        'ricotta',
        'mascarpone',
        'yogurt',
        'butter',
        'heavy cream',
        'cream',
        'whey',
        'lactose',
        'casein',
      ],
    },
  },
  {
    id: 'frutos_de_cascara',
    nombre: {
      es: 'Frutos de cáscara (frutos secos arbóreos)',
      en: 'Tree nuts and products thereof',
    },
    sinonimos: [
      'frutos de cascara',
      'frutos de cáscara',
      'frutos secos',
      'almendra',
      'almendras',
      'avellana',
      'avellanas',
      'nuez',
      'nueces',
      'anacardo',
      'anacardos',
      'pistacho',
      'pistachos',
      'pecana',
      'pecanas',
      'macadamia',
      'tree nuts',
      'nuts',
      'almonds',
      'hazelnuts',
      'walnuts',
      'cashews',
      'pistachios',
      'pecans',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'almendras',
        'avellanas',
        'nueces',
        'anacardos',
        'pistachos',
        'pecanas',
        'nueces de brasil',
        'nueces de macadamia',
        'crema de avellanas',
        'harina de almendra',
      ],
      en: [
        'almonds',
        'hazelnuts',
        'walnuts',
        'cashews',
        'pistachios',
        'pecans',
        'brazil nuts',
        'macadamia nuts',
        'almond flour',
        'hazelnut butter',
      ],
    },
  },
  {
    id: 'apio',
    nombre: {
      es: 'Apio y productos derivados',
      en: 'Celery and products thereof',
    },
    sinonimos: [
      'apio',
      'apio nabo',
      'sal de apio',
      'semillas de apio',
      'celery',
      'celeriac',
      'celery salt',
      'celery seeds',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'apio',
        'apio nabo',
        'sal de apio',
        'semillas de apio',
        'caldo con apio',
      ],
      en: [
        'celery',
        'celeriac',
        'celery salt',
        'celery seeds',
        'broth with celery',
      ],
    },
  },
  {
    id: 'mostaza',
    nombre: {
      es: 'Mostaza y productos derivados',
      en: 'Mustard and products thereof',
    },
    sinonimos: [
      'mostaza',
      'granos de mostaza',
      'salsa de mostaza',
      'dijon',
      'mustard',
      'mustard seeds',
      'dijon mustard',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'mostaza',
        'granos de mostaza',
        'mostaza de dijon',
        'mostaza antigua',
        'aceite de mostaza',
      ],
      en: [
        'mustard',
        'mustard seeds',
        'dijon mustard',
        'wholegrain mustard',
        'mustard oil',
      ],
    },
  },
  {
    id: 'sesamo',
    nombre: {
      es: 'Granos de sésamo y derivados',
      en: 'Sesame seeds and products thereof',
    },
    sinonimos: [
      'sesamo',
      'sésamo',
      'ajonjoli',
      'ajonjolí',
      'tahini',
      'tahina',
      'aceite de sesamo',
      'aceite de sésamo',
      'sesame',
      'sesame seeds',
      'sesame oil',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'sésamo',
        'ajonjolí',
        'semillas de sésamo',
        'tahini',
        'aceite de sésamo',
        'gomashio',
      ],
      en: [
        'sesame seeds',
        'tahini',
        'sesame oil',
        'gomashio',
      ],
    },
  },
  {
    id: 'dioxido_azufre_sulfitos',
    nombre: {
      es: 'Dióxido de azufre y sulfitos (>10 mg/kg o 10 mg/l)',
      en: 'Sulphur dioxide and sulphites (>10 mg/kg or 10 mg/l)',
    },
    sinonimos: [
      'sulfitos',
      'sulfito',
      'dioxido de azufre',
      'dióxido de azufre',
      'sulphites',
      'sulfites',
      'sulphur dioxide',
      'e220',
      'e221',
      'e222',
      'e223',
      'e224',
      'e226',
      'e227',
      'e228',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'vino con sulfitos',
        'vinagre con sulfitos',
        'frutas desecadas con sulfitos',
        'mostos sulfitados',
        'conservas con sulfitos (E220-E228)',
      ],
      en: [
        'wine with sulphites',
        'vinegar with sulphites',
        'dried fruit with sulphites',
        'preserves with sulphites (E220-E228)',
      ],
    },
  },
  {
    id: 'altramuces',
    nombre: {
      es: 'Altramuces y derivados',
      en: 'Lupin and products thereof',
    },
    sinonimos: [
      'altramuces',
      'altramuz',
      'chochos',
      'harina de altramuz',
      'lupin',
      'lupine',
      'lupin flour',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'altramuces',
        'harina de altramuz',
        'semillas de altramuz',
      ],
      en: [
        'lupin',
        'lupine',
        'lupin flour',
        'lupin seeds',
      ],
    },
  },
  {
    id: 'moluscos',
    nombre: {
      es: 'Moluscos y derivados',
      en: 'Molluscs and products thereof',
    },
    sinonimos: [
      'moluscos',
      'molusco',
      'mejillon',
      'mejillón',
      'mejillones',
      'almeja',
      'almejas',
      'calamar',
      'calamares',
      'pulpo',
      'pulpos',
      'sepia',
      'ostras',
      'navajas',
      'berberechos',
      'molluscs',
      'mollusks',
      'mussels',
      'clams',
      'squid',
      'octopus',
      'oysters',
    ],
    severidad: 'critica',
    exclusiones: {
      es: [
        'mejillones',
        'almejas',
        'calamares',
        'pulpo',
        'sepia',
        'ostras',
        'navajas',
        'berberechos',
        'chipirones',
        'tinta de calamar',
      ],
      en: [
        'mussels',
        'clams',
        'squid',
        'octopus',
        'cuttlefish',
        'oysters',
        'cockles',
        'razor clams',
        'squid ink',
      ],
    },
  },
];

// =============================================================================
// 2. PROTOCOLOS CLÍNICOS Y OBJETIVOS PATOLÓGICOS DETALLADOS
// =============================================================================

export interface ClinicalProtocolDefinition {
  id: string;
  key: string;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  severidad: SeveridadClinica;
  prohibidos: { es: string[]; en: string[] };
  reglasCulinarias: { es: string; en: string };
}

export const PROTOCOLOS_CLINICOS: ClinicalProtocolDefinition[] = [
  {
    id: 'General',
    key: 'general',
    label: 'General (Equilibrada)',
    labelEn: 'General (Balanced)',
    desc: 'Sin restricciones clínicas específicas. Nutrición variada, sostenible y real.',
    descEn: 'No specific clinical restrictions. Varied, sustainable, and whole nutrition.',
    severidad: 'moderada',
    prohibidos: { es: [], en: [] },
    reglasCulinarias: {
      es: 'Priorizar ingredientes frescos de temporada y métodos de cocción respetuosos.',
      en: 'Prioritize fresh seasonal ingredients and wholesome cooking methods.',
    },
  },
  {
    id: 'FODMAP',
    key: 'fodmap',
    label: 'FODMAP (Bajo en fermentables)',
    labelEn: 'Low FODMAP (Low fermentable)',
    desc: 'Excluye oligosacáridos, disacáridos, monosacáridos y polioles fermentables para alivio digestivo.',
    descEn: 'Excludes fermentable oligosaccharides, disaccharides, monosaccharides, and polyols for gut relief.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'ajo',
        'ajos',
        'pasta de ajo',
        'ajo en polvo',
        'cebolla',
        'cebollas',
        'cebolla dulce',
        'cebolla morada',
        'cebolla blanca',
        'cebolla roja',
        'cebolleta',
        'chalota',
        'chalotas',
        'puerro',
        'puerros',
        'garbanzo',
        'garbanzos',
        'garbanzos cocidos',
        'lenteja',
        'lentejas',
        'alubia',
        'alubias',
        'alubias blancas',
        'alubias rojas',
        'judía',
        'judías',
        'judias',
        'frijol',
        'frijoles',
        'frijoles negros',
        'habas',
        'habitas',
        'soja',
        'edamame',
        'legumbres',
        'leche',
        'leche evaporada',
        'leche condensada',
        'leche entera',
        'leche desnatada',
        'leche semidesnatada',
        'leche de vaca',
        'leche de cabra',
        'leche de oveja',
        'nata',
        'nata para cocinar',
        'nata líquida',
        'crema de leche',
        'queso',
        'quesos',
        'queso fresco',
        'queso crema',
        'ricotta',
        'mascarpone',
        'requesón',
        'mantequilla',
        'yogur',
        'yogurt',
        'suero de leche',
        'lactosa',
        'trigo',
        'harina de trigo',
        'pan de trigo',
        'pan blanco',
        'pan',
        'pasta de trigo',
        'pasta',
        'cuscús',
        'sémola',
        'semola',
        'centeno',
        'cebada',
        'espelta',
        'kamut',
        'miel',
        'sirope de agave',
        'jarabe de maíz',
        'jarabe de maíz alto en fructosa',
        'manzana',
        'manzanas',
        'pera',
        'peras',
        'mango',
        'mangos',
        'sandía',
        'sandia',
        'cereza',
        'cerezas',
        'melocotón',
        'melocoton',
        'ciruela',
        'ciruelas',
        'higo',
        'higos',
        'moras',
        'xilitol',
        'sorbitol',
        'manitol',
        'maltitol',
        'isomalt',
        'setas',
        'champiñón',
        'champiñones',
        'champinon',
        'champinones',
        'boletus',
        'portobello',
        'shiitake',
        'coliflor',
        'alcachofa',
        'alcachofas',
        'espárrago',
        'espárragos',
        'esparrago',
        'esparragos',
      ],
      en: [
        'garlic',
        'garlic cloves',
        'garlic paste',
        'garlic powder',
        'onion',
        'onions',
        'sweet onion',
        'red onion',
        'white onion',
        'shallot',
        'shallots',
        'leek',
        'leeks',
        'scallion',
        'chickpea',
        'chickpeas',
        'canned chickpeas',
        'lentil',
        'lentils',
        'bean',
        'beans',
        'black beans',
        'kidney beans',
        'cannellini',
        'navy beans',
        'pinto beans',
        'fava beans',
        'broad beans',
        'soy',
        'soybeans',
        'edamame',
        'legumes',
        'milk',
        'evaporated milk',
        'condensed milk',
        'cow milk',
        'whole milk',
        'skim milk',
        'cream',
        'heavy cream',
        'sour cream',
        'cheese',
        'fresh cheese',
        'cream cheese',
        'butter',
        'yogurt',
        'whey',
        'ricotta',
        'mascarpone',
        'cottage cheese',
        'lactose',
        'wheat',
        'wheat flour',
        'wheat bread',
        'white bread',
        'bread',
        'wheat pasta',
        'pasta',
        'couscous',
        'semolina',
        'rye',
        'barley',
        'spelt',
        'kamut',
        'honey',
        'agave syrup',
        'high-fructose corn syrup',
        'apple',
        'apples',
        'pear',
        'pears',
        'mango',
        'mangoes',
        'watermelon',
        'cherry',
        'cherries',
        'peach',
        'peaches',
        'plum',
        'plums',
        'fig',
        'figs',
        'blackberries',
        'xylitol',
        'sorbitol',
        'mannitol',
        'maltitol',
        'isomalt',
        'mushrooms',
        'mushroom',
        'cauliflower',
        'artichoke',
        'artichokes',
        'asparagus',
      ],
    },
    reglasCulinarias: {
      es: 'Compensar aroma de ajo/cebolla usando aceites infusionados o la parte verde de la cebolleta/puerro; frutas como plátano o kiwi deben especificarse "verdes" o "firmes"; permitir lentejas solo si son de bote bien enjuagadas en pequeñas cantidades (<40g).',
      en: 'Compensate garlic/onion aroma using garlic-infused oils or green stems of scallions/leeks; bananas or kiwis must be specified as "firm" or "unripe"; allow lentils only canned and thoroughly rinsed in small amounts (<40g).',
    },
  },
  {
    id: 'SII',
    key: 'sii',
    label: 'SII (Intestino Irritable)',
    labelEn: 'IBS (Irritable Bowel Syndrome)',
    desc: 'Alivio de espasmos, distensión abdominal y tránsito intestinal irregular mediante protocolo FODMAP.',
    descEn: 'Relief from spasms, abdominal bloating, and irregular transit via low FODMAP protocol.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'ajo',
        'ajos',
        'pasta de ajo',
        'cebolla',
        'cebollas',
        'cebolla dulce',
        'cebolla morada',
        'cebolla blanca',
        'cebolla roja',
        'cebolleta',
        'chalota',
        'chalotas',
        'puerro',
        'puerros',
        'garbanzo',
        'garbanzos',
        'garbanzos cocidos',
        'lenteja',
        'lentejas',
        'alubia',
        'alubias',
        'alubias blancas',
        'judía',
        'judías',
        'judias',
        'frijol',
        'frijoles',
        'habas',
        'soja',
        'edamame',
        'legumbres',
        'leche',
        'leche evaporada',
        'leche condensada',
        'leche entera',
        'leche desnatada',
        'leche semidesnatada',
        'nata',
        'nata para cocinar',
        'crema de leche',
        'queso',
        'quesos',
        'queso fresco',
        'queso crema',
        'ricotta',
        'mascarpone',
        'mantequilla',
        'yogur',
        'yogurt',
        'lactosa',
        'trigo',
        'harina de trigo',
        'pan de trigo',
        'pan blanco',
        'pasta de trigo',
        'pasta',
        'cuscús',
        'sémola',
        'centeno',
        'cebada',
        'miel',
        'sirope de agave',
        'jarabe de maíz',
        'manzana',
        'manzanas',
        'pera',
        'peras',
        'mango',
        'sandía',
        'cereza',
        'melocotón',
        'ciruela',
        'xilitol',
        'sorbitol',
        'manitol',
        'setas',
        'champiñón',
        'champiñones',
        'coliflor',
        'alcachofa',
        'espárragos',
      ],
      en: [
        'garlic',
        'garlic cloves',
        'onion',
        'onions',
        'sweet onion',
        'shallot',
        'leek',
        'chickpea',
        'chickpeas',
        'lentil',
        'lentils',
        'bean',
        'beans',
        'soy',
        'soybeans',
        'milk',
        'evaporated milk',
        'condensed milk',
        'cream',
        'heavy cream',
        'cheese',
        'fresh cheese',
        'butter',
        'yogurt',
        'lactose',
        'wheat',
        'wheat flour',
        'bread',
        'pasta',
        'rye',
        'barley',
        'honey',
        'apple',
        'pear',
        'mango',
        'watermelon',
        'cherry',
        'peach',
        'plum',
        'mushrooms',
        'cauliflower',
        'artichoke',
        'asparagus',
      ],
    },
    reglasCulinarias: {
      es: 'Compensar aroma de ajo/cebolla usando aceites infusionados o la parte verde de la cebolleta/puerro; frutas como plátano o kiwi deben especificarse "verdes" o "firmes"; permitir lentejas solo si son de bote bien enjuagadas en pequeñas cantidades (<40g).',
      en: 'Compensate garlic/onion aroma using garlic-infused oils or green stems of scallions/leeks; bananas or kiwis must be specified as "firm" or "unripe"; allow lentils only canned and thoroughly rinsed in small amounts (<40g).',
    },
  },
  {
    id: 'Sin Lactosa',
    key: 'sin_lactosa',
    label: 'Sin Lactosa (Intolerancia)',
    labelEn: 'Lactose-Free (Intolerance)',
    desc: 'Excluye lácteos convencionales con disacáridos de lactosa para prevenir malabsorción y dolor abdominal.',
    descEn: 'Excludes conventional dairy with lactose disaccharides to prevent malabsorption and abdominal distress.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'leche',
        'leche de vaca',
        'leche entera',
        'leche desnatada',
        'leche semidesnatada',
        'leche evaporada',
        'leche condensada',
        'leche de cabra',
        'leche de oveja',
        'nata',
        'nata para cocinar',
        'nata líquida',
        'crema de leche',
        'queso fresco',
        'queso tierno',
        'queso crema',
        'ricotta',
        'mascarpone',
        'requesón',
        'mantequilla tradicional',
        'yogur convencional',
        'yogurt',
        'suero de leche',
        'helado de leche',
        'lactosa',
      ],
      en: [
        'milk',
        'cow milk',
        'whole milk',
        'skim milk',
        'evaporated milk',
        'condensed milk',
        'goat milk',
        'sheep milk',
        'cream',
        'heavy cream',
        'sour cream',
        'fresh cheese',
        'cream cheese',
        'ricotta',
        'mascarpone',
        'cottage cheese',
        'traditional butter',
        'conventional yogurt',
        'yogurt',
        'whey',
        'ice cream',
        'lactose',
      ],
    },
    reglasCulinarias: {
      es: 'Sustituir lácteos por bebidas vegetales (avena, almendra, soja) o versiones certificadas sin lactosa; en quesos, permitir curados de muy larga maduración (>12 meses) que no contienen lactosa residual.',
      en: 'Substitute dairy with plant-based milks (oat, almond, soy) or certified lactose-free versions; for cheeses, allow hard aged cheeses (>12 months) naturally lactose-free.',
    },
  },
  {
    id: 'Baja en Histamina',
    key: 'bajo_histamina',
    label: 'Baja en Histamina',
    labelEn: 'Low Histamine',
    desc: 'Evita alimentos fermentados, curados o liberadores de histamina para control de DAO.',
    descEn: 'Avoids fermented, aged, or histamine-releasing ingredients for DAO support.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'tomate',
        'berenjena',
        'espinacas',
        'aguacate',
        'fresas',
        'arándanos',
        'frambuesas',
        'moras',
        'cítricos',
        'plátano maduro',
        'chocolate',
        'cacao',
        'embutidos',
        'quesos curados o fermentados',
        'kéfir',
        'yogur',
        'chucrut',
        'vinagre',
        'alcohol',
        'conservas de pescado',
        'atún',
        'caballa',
        'marisco',
        'salsa de soja',
        'clara líquida cruda',
      ],
      en: [
        'tomato',
        'eggplant',
        'spinach',
        'avocado',
        'strawberries',
        'blueberries',
        'raspberries',
        'blackberries',
        'citrus fruits',
        'ripe banana',
        'chocolate',
        'cocoa',
        'cured meats',
        'aged or fermented cheeses',
        'kefir',
        'yogurt',
        'sauerkraut',
        'vinegar',
        'alcohol',
        'canned fish',
        'tuna',
        'mackerel',
        'shellfish',
        'soy sauce',
        'raw liquid egg white',
      ],
    },
    reglasCulinarias: {
      es: 'Ingredientes ultra-frescos o congelados de origen; carnes y pescados blancos recién cocinados, nunca sobras de más de 24h; evitar cocciones lentas prolongadas.',
      en: 'Ultra-fresh or frozen-at-source ingredients; freshly cooked white fish and poultry, never leftovers older than 24h; avoid slow-cooked bone broths.',
    },
  },
  {
    id: 'Sin Gluten',
    key: 'sin_gluten',
    label: 'Sin Gluten (Celiaquía / Sensibilidad)',
    labelEn: 'Gluten-Free (Celiac / Sensitivity)',
    desc: 'Tolerancia cero estricta a trigo, centeno, cebada y prevención de contaminación cruzada.',
    descEn: 'Strict zero tolerance for wheat, rye, barley, and prevention of cross-contamination.',
    severidad: 'critica',
    prohibidos: {
      es: [
        'trigo',
        'cebada',
        'centeno',
        'espelta',
        'kamut',
        'triticale',
        'avena no certificada',
        'salsas de soja tradicionales con trigo',
        'cerveza convencional',
        'pan de trigo',
        'pasta de trigo',
        'harinas de trigo',
        'rebozados con gluten',
      ],
      en: [
        'wheat',
        'barley',
        'rye',
        'spelt',
        'kamut',
        'triticale',
        'non-certified oats',
        'traditional soy sauces with wheat',
        'conventional beer',
        'wheat bread',
        'wheat pasta',
        'wheat flours',
        'gluten-containing batters',
      ],
    },
    reglasCulinarias: {
      es: 'Tolerancia cero. Sustituir por harinas y granos certificados sin gluten (arroz, maíz, trigo sarraceno, quinoa); usar salsa tamari 100% sin trigo; extremar prevención de contaminación cruzada.',
      en: 'Zero tolerance. Substitute with certified gluten-free grains/flours (rice, corn, buckwheat, quinoa); use 100% wheat-free tamari; strictly prevent cross-contamination.',
    },
  },
  {
    id: 'Dieta Blanda',
    key: 'dieta_blanda',
    label: 'Dieta Blanda (Gástrica)',
    labelEn: 'Bland Diet (Gastric)',
    desc: 'Cocciones suaves, sin grasas agresivas, picantes ni irritantes de la mucosa digestiva.',
    descEn: 'Gentle cooking methods without heavy fats, spices, or gastric mucosal irritants.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'ajo crudo',
        'cebolla cruda',
        'fritos',
        'rebozados',
        'picantes',
        'alcohol',
        'café',
        'cítricos en exceso',
        'tomate crudo',
        'ensaladas crudas fibrosas',
        'legumbres enteras',
        'carnes grasas',
        'menta',
        'chocolate',
      ],
      en: [
        'raw garlic',
        'raw onion',
        'deep-fried foods',
        'battered foods',
        'spicy seasonings',
        'alcohol',
        'coffee',
        'excessive citrus',
        'raw tomato',
        'fibrous raw salads',
        'whole legumes',
        'fatty meats',
        'mint',
        'chocolate',
      ],
    },
    reglasCulinarias: {
      es: 'Cocciones al vapor, papillote, hervidos y cremas suaves. Texturas tiernas que minimicen el esfuerzo digestivo.',
      en: 'Cooking methods: steam, en papillote, boiling, and smooth purees. Soft textures to minimize digestive effort.',
    },
  },
  {
    id: 'Antirreflujo',
    key: 'antirreflujo',
    label: 'Antirreflujo (ERGE)',
    labelEn: 'Acid Reflux / GERD',
    desc: 'Evita acidez gástrica, relajantes del cardias, cítricos, menta, chocolate, ajo, cebolla y fritos.',
    descEn: 'Avoids gastric acidity, LES relaxants, citrus, mint, chocolate, garlic, onion, and frying.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'ajo crudo',
        'cebolla cruda',
        'fritos',
        'rebozados',
        'picantes',
        'alcohol',
        'café',
        'cítricos en exceso',
        'tomate crudo',
        'ensaladas crudas fibrosas',
        'legumbres enteras',
        'carnes grasas',
        'menta',
        'chocolate',
      ],
      en: [
        'raw garlic',
        'raw onion',
        'deep-fried foods',
        'battered foods',
        'spicy seasonings',
        'alcohol',
        'coffee',
        'excessive citrus',
        'raw tomato',
        'fibrous raw salads',
        'whole legumes',
        'fatty meats',
        'mint',
        'chocolate',
      ],
    },
    reglasCulinarias: {
      es: 'Cocciones suaves al vapor o papillote; no utilizar salsas ácidas ni grasas concentradas; respetar volumen moderado de ración.',
      en: 'Gentle steaming or en papillote; avoid acidic or heavy fat sauces; maintain moderate portion volumes.',
    },
  },
  {
    id: 'Resistencia a la Insulina',
    key: 'resistencia_insulina',
    label: 'Resistencia a la Insulina',
    labelEn: 'Insulin Resistance',
    desc: 'Control glucémico estricto con bajo índice y carga glucémica, preservando saciedad y fibra.',
    descEn: 'Strict glycemic control with low glycemic index and load, maintaining satiety and fiber.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'azúcares añadidos',
        'azúcar de mesa',
        'miel',
        'siropes',
        'jarabes de glucosa/maíz',
        'harinas blancas ultra-refinadas',
        'pan blanco',
        'arroz blanco precocido',
        'zumos de fruta (incluso naturales sin fibra)',
        'bollería',
      ],
      en: [
        'added sugars',
        'table sugar',
        'honey',
        'syrups',
        'glucose/corn syrups',
        'ultra-refined white flours',
        'white bread',
        'precooked white rice',
        'fruit juices (even fresh without pulp)',
        'commercial pastries',
      ],
    },
    reglasCulinarias: {
      es: 'Priorizar almidón resistente (arroz o patata cocidos y enfriados 24h a 4°C); combinar siempre carbohidratos con fibra, proteína y grasas saludables.',
      en: 'Prioritize resistant starch (rice or potato cooked and cooled 24h at 4°C); always pair carbohydrates with dietary fiber, lean protein, and healthy fats.',
    },
  },
  {
    id: 'Diabetes Tipo 2',
    key: 'diabetes_tipo_2',
    label: 'Diabetes Tipo 2',
    labelEn: 'Type 2 Diabetes',
    desc: 'Prioriza fibra soluble, estabilidad glucémica y elimina azúcares simples y harinas refinadas.',
    descEn: 'Prioritizes soluble fiber, glycemic stability, and eliminates simple sugars and refined flours.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'azúcares añadidos',
        'azúcar de mesa',
        'miel',
        'siropes',
        'jarabes de glucosa/maíz',
        'harinas blancas ultra-refinadas',
        'pan blanco',
        'arroz blanco precocido',
        'zumos de fruta (incluso naturales sin fibra)',
        'bollería',
      ],
      en: [
        'added sugars',
        'table sugar',
        'honey',
        'syrups',
        'glucose/corn syrups',
        'ultra-refined white flours',
        'white bread',
        'precooked white rice',
        'fruit juices (even fresh without pulp)',
        'commercial pastries',
      ],
    },
    reglasCulinarias: {
      es: 'Priorizar almidón resistente (arroz o patata cocidos y enfriados); combinar siempre carbohidratos con fibra soluble, proteína magra y grasas monoinsaturadas.',
      en: 'Prioritize resistant starch (cooked and cooled potatoes/rice); always pair carbs with soluble fiber, lean protein, and monounsaturated fats.',
    },
  },
  {
    id: 'Hígado Graso',
    key: 'higado_graso',
    label: 'Hígado Graso (EHNA)',
    labelEn: 'Fatty Liver (NAFLD)',
    desc: 'Protección hepatocelular: cero fructosa libre añadida, alcohol total ni grasas trans.',
    descEn: 'Hepatocellular protection: zero free added fructose, zero alcohol, zero trans fats.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'alcohol total',
        'bebidas azucaradas',
        'refrescos',
        'zumos de fruta',
        'jarabe de maíz de alta fructosa',
        'harinas refinadas',
        'grasas trans',
      ],
      en: [
        'total alcohol',
        'sugary beverages',
        'sodas',
        'fruit juices',
        'high-fructose corn syrup',
        'refined flours',
        'trans fats',
      ],
    },
    reglasCulinarias: {
      es: 'Cero alcohol en recetas (no usar reducciones de vino); primar aceite de oliva virgen extra en crudo, crucíferas y fuentes ricas en antioxidantes y colina.',
      en: 'Zero alcohol in recipes (no wine reductions); emphasize raw extra virgin olive oil, cruciferous vegetables, and antioxidant-rich whole foods.',
    },
  },
  {
    id: 'Hipercolesterolemia',
    key: 'hipercolesterolemia',
    label: 'Hipercolesterolemia',
    labelEn: 'High Cholesterol',
    desc: 'Reducción de grasas saturadas proaterogénicas, carnes procesadas y fitoesteroles activos.',
    descEn: 'Reduction of pro-atherogenic saturated fats, processed meats, and active phytosterols.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'grasas trans',
        'aceites de palma y coco hidrogenados',
        'carnes procesadas',
        'embutidos grasos',
        'manteca',
        'frituras comerciales',
      ],
      en: [
        'trans fats',
        'hydrogenated palm and coconut oils',
        'processed meats',
        'fatty cured sausages',
        'lard',
        'commercial deep-fried foods',
      ],
    },
    reglasCulinarias: {
      es: 'Priorizar grasas monoinsaturadas (AOVE) y poliinsaturadas omega-3 (pescado azul, nueces); aumentar fibra soluble (avena, legumbres).',
      en: 'Prioritize monounsaturated fats (EVOO) and omega-3 polyunsaturated fats (oily fish, walnuts); boost soluble fiber (oats, legumes).',
    },
  },
  {
    id: 'Dislipemia Familiar',
    key: 'dislipemia_familiar',
    label: 'Dislipemia Familiar',
    labelEn: 'Familial Dyslipidemia',
    desc: 'Optimización lipídica clínica con grasas monoinsaturadas, omega-3 y estricto control aterogénico.',
    descEn: 'Clinical lipid optimization with monounsaturated fats, omega-3, and strict atherogenic control.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'grasas trans',
        'aceites de palma y coco hidrogenados',
        'carnes procesadas',
        'embutidos grasos',
        'manteca',
        'frituras comerciales',
      ],
      en: [
        'trans fats',
        'hydrogenated palm and coconut oils',
        'processed meats',
        'fatty cured sausages',
        'lard',
        'commercial deep-fried foods',
      ],
    },
    reglasCulinarias: {
      es: 'Eliminar grasas saturadas de cocción; usar exclusivamente aceite de oliva virgen extra y semillas ricas en omega-3.',
      en: 'Eliminate cooking saturated fats; exclusively use extra virgin olive oil and omega-3 rich seeds.',
    },
  },
  {
    id: 'Gota',
    key: 'gota',
    label: 'Gota / Ácido Úrico (Hiperuricemia)',
    labelEn: 'Gout / Uric Acid (Hyperuricemia)',
    desc: 'Control estricto de purinas para prevenir brotes agudos de gota y cálculos de urato.',
    descEn: 'Strict purine restriction to prevent acute gout flares and urate stones.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'vísceras (hígado, riñones)',
        'extractos de carne',
        'caldos concentrados industriales',
        'mariscos',
        'sardinas',
        'anchoas',
        'arenques',
        'caballa',
        'huevas de pescado',
        'espárragos',
        'espinacas',
        'coliflor',
        'setas',
        'cerveza',
        'levadura de cerveza',
        'fructosa libre industrial',
      ],
      en: [
        'organ meats (liver, kidneys)',
        'meat extracts',
        'industrial bouillon cubes',
        'shellfish',
        'sardines',
        'anchovies',
        'herrings',
        'mackerel',
        'fish roe',
        'asparagus',
        'spinach',
        'cauliflower',
        'mushrooms',
        'beer',
        'brewer yeast',
        'industrial free fructose',
      ],
    },
    reglasCulinarias: {
      es: 'Descartar el agua de cocción de hervidos (las purinas son hidrosolubles); priorizar proteínas lácteas/huevos/vegetales bajas en purinas; hidratación hídrica abundante.',
      en: 'Discard boiling water from cooked foods (purines are water-soluble); prioritize dairy, egg, and low-purine plant proteins; maintain high hydration.',
    },
  },
  {
    id: 'Hashimoto',
    key: 'hashimoto',
    label: 'Hashimoto (Tiroides Autoinmune)',
    labelEn: 'Hashimoto (Autoimmune Thyroid)',
    desc: 'Protocolo autoinmune sin gluten, lácteos bovinos ni soja inflamatoria con balance de yodo.',
    descEn: 'Autoimmune protocol without gluten, bovine dairy, or inflammatory soy with iodine balance.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'gluten (trigo, centeno, cebada)',
        'lácteos de vaca (caseína A1)',
        'soja no fermentada',
        'exceso de yodo (algas marinas, kelp, sal yodada excesiva)',
        'aceites refinados de semillas',
        'azúcares añadidos',
      ],
      en: [
        'gluten (wheat, rye, barley)',
        'cow dairy (A1 casein)',
        'unfermented soy',
        'excess iodine (seaweed, kelp, excess iodized salt)',
        'refined seed oils',
        'added sugars',
      ],
    },
    reglasCulinarias: {
      es: 'Cocinar las verduras crucíferas (brócoli, repollo) al vapor o salteadas para inactivar bociógenos; sustituir lácteos de vaca por bebidas vegetales enriquecidas sin carragenano.',
      en: 'Cook cruciferous vegetables (broccoli, cabbage) steamed or sauteed to deactivate goitrogens; substitute cow dairy with clean calcium-fortified plant milks without carrageenan.',
    },
  },
  {
    id: 'SOP',
    key: 'sop',
    label: 'SOP (Ovario Poliquístico)',
    labelEn: 'PCOS (Polycystic Ovary Syndrome)',
    desc: 'Regulación hormonal, sensibilización insulínica y nutrición anti-androgénica.',
    descEn: 'Hormonal regulation, insulin sensitization, and anti-androgenic nutrition.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'azúcares añadidos',
        'jarabes',
        'harinas blancas ultra-refinadas',
        'lácteos bovinos convencionales desnatados',
        'grasas trans',
        'zumos',
        'alcohol',
      ],
      en: [
        'added sugars',
        'syrups',
        'ultra-refined white flours',
        'conventional skimmed cow dairy',
        'trans fats',
        'fruit juices',
        'alcohol',
      ],
    },
    reglasCulinarias: {
      es: 'Añadir canela de Ceilán en desayunos/snacks para mejorar sensibilidad a la insulina; incluir semillas de calabaza y lino; equilibrar carbohidratos con proteína.',
      en: 'Add Ceylon cinnamon to improve insulin sensitivity; include pumpkin and flax seeds; balance complex carbs with clean protein.',
    },
  },
  {
    id: 'Endometriosis',
    key: 'endometriosis',
    label: 'Endometriosis',
    labelEn: 'Endometriosis',
    desc: 'Dieta antiinflamatoria pélvica, depuración estrogénica y sin carnes rojas proinflamatorias.',
    descEn: 'Anti-inflammatory pelvic diet, estrogen clearance, and no pro-inflammatory red meats.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'gluten',
        'carnes rojas intensivas',
        'embutidos',
        'lácteos de vaca',
        'grasas trans',
        'aceites ricos en omega-6',
        'ajo crudo',
        'cebolla cruda',
        'alcachofas',
        'espárragos',
        'coliflor',
      ],
      en: [
        'gluten',
        'intensive red meats',
        'cured sausages',
        'cow dairy',
        'trans fats',
        'omega-6 heavy oils',
        'raw garlic',
        'raw onion',
        'artichokes',
        'asparagus',
        'cauliflower',
      ],
    },
    reglasCulinarias: {
      es: 'Filtro anti "endo-belly": preferir vegetales cocidos y digeribles antes que ensaladas crudas fibrosas; infusiones de cúrcuma con jengibre y pimienta negra.',
      en: 'Anti "endo-belly" protocol: prefer well-cooked tender vegetables over raw fibrous salads; incorporate turmeric-ginger infusions with black pepper.',
    },
  },
  {
    id: 'Antiinflamatorio',
    key: 'antiinflamatorio',
    label: 'Antiinflamatorio General',
    labelEn: 'Anti-inflammatory General',
    desc: 'Rico en polifenoles, omega-3 y antioxidantes frente a procesos inflamatorios de bajo grado.',
    descEn: 'Rich in polyphenols, omega-3, and antioxidants against low-grade systemic inflammation.',
    severidad: 'moderada',
    prohibidos: {
      es: [
        'aceites refinados de semillas industriales (maíz, girasol)',
        'grasas trans',
        'carnes rojas procesadas',
        'azúcares añadidos',
        'harinas refinadas',
        'ultraprocesados',
      ],
      en: [
        'refined industrial seed oils (corn, sunflower)',
        'trans fats',
        'processed red meats',
        'added sugars',
        'refined flours',
        'ultra-processed foods',
      ],
    },
    reglasCulinarias: {
      es: 'Base de aceite de oliva virgen extra en crudo, pescados azules pequeños (sardina, caballa fresca), frutos rojos y especias antiinflamatorias (romero, cúrcuma).',
      en: 'Base of raw extra virgin olive oil, small oily fish, berries, and anti-inflammatory herbs/spices (rosemary, turmeric).',
    },
  },
];

// =============================================================================
// 3. PATRONES ALIMENTARIOS DETALLADOS
// =============================================================================

export interface DietaryPatternDefinition {
  id: string;
  key: string;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  prohibidos: { es: string[]; en: string[] };
  reglasCulinarias: { es: string; en: string };
}

export const PATRONES_ALIMENTARIOS_DATA: DietaryPatternDefinition[] = [
  {
    id: 'Omnívora',
    key: 'omnivora',
    label: 'Omnívora Flexible',
    labelEn: 'Flexible Omnivore',
    desc: 'Incluye alimentos de todos los grupos con énfasis en alimentos reales sin ultraprocesados.',
    descEn: 'Includes all food groups with emphasis on whole, real foods without ultra-processing.',
    prohibidos: { es: [], en: [] },
    reglasCulinarias: {
      es: 'Balance armónico entre proteína animal de calidad, legumbres y abundantes vegetales.',
      en: 'Harmonious balance between quality animal protein, legumes, and abundant vegetables.',
    },
  },
  {
    id: 'Mediterránea',
    key: 'mediterranea',
    label: 'Dieta Mediterránea Tradicional',
    labelEn: 'Traditional Mediterranean Diet',
    desc: 'Patrón tradicional basado en AOVE, legumbres, verduras de huerta, frutas y pescado.',
    descEn: 'Traditional pattern based on EVOO, legumes, garden vegetables, fruits, and fish.',
    prohibidos: {
      es: [
        'ultraprocesados',
        'aceites refinados de semillas',
        'refrescos azucarados',
      ],
      en: [
        'ultra-processed foods',
        'refined seed oils',
        'sugary sodas',
      ],
    },
    reglasCulinarias: {
      es: 'Usar AOVE como grasa principal de cocinado y aliño; primar sofrito tradicional a fuego lento.',
      en: 'Use EVOO as primary cooking and dressing fat; emphasize traditional slow sofrito base.',
    },
  },
  {
    id: 'Vegetariana',
    key: 'vegetariana',
    label: 'Ovolactovegetariana',
    labelEn: 'Vegetarian (Ovo-lacto)',
    desc: 'Sin carnes ni pescados. Permite huevos y lácteos seleccionados.',
    descEn: 'No meat or fish. Allows selected eggs and dairy.',
    prohibidos: {
      es: [
        'carne',
        'aves',
        'pescado',
        'marisco',
        'gelatina animal',
      ],
      en: [
        'meat',
        'poultry',
        'fish',
        'shellfish',
        'animal gelatin',
      ],
    },
    reglasCulinarias: {
      es: 'Asegurar combinaciones de proteínas completas: legumbres + cereales integrales o huevos de calidad.',
      en: 'Ensure complete protein pairings: legumes + whole grains or pastured eggs.',
    },
  },
  {
    id: 'Vegana',
    key: 'vegana',
    label: '100% Vegetal (Vegana)',
    labelEn: 'Plant-Based (Vegan)',
    desc: 'Exclusivamente ingredientes de origen vegetal con sustitución proteica equilibrada.',
    descEn: 'Exclusively plant-derived ingredients with balanced protein replacement.',
    prohibidos: {
      es: [
        'carne',
        'aves',
        'pescado',
        'marisco',
        'huevos',
        'lácteos',
        'miel',
        'gelatina animal',
        'productos de origen animal',
      ],
      en: [
        'meat',
        'poultry',
        'fish',
        'shellfish',
        'eggs',
        'dairy',
        'honey',
        'animal gelatin',
        'animal-derived products',
      ],
    },
    reglasCulinarias: {
      es: 'Sustituir lácteos por bebidas vegetales sin azúcares y proteínas por tofu, tempeh, legumbres o levadura nutricional.',
      en: 'Substitute dairy with unsweetened plant milks and proteins with tofu, tempeh, legumes, or nutritional yeast.',
    },
  },
  {
    id: 'Paleo',
    key: 'paleo',
    label: 'Paleodieta',
    labelEn: 'Paleo Diet',
    desc: 'Inspirada en el cazador-recolector: sin cereales, legumbres ni lácteos procesados.',
    descEn: 'Hunter-gatherer inspired: no grains, legumes, or processed dairy.',
    prohibidos: {
      es: [
        'cereales (trigo, arroz, avena, maíz)',
        'legumbres',
        'lácteos',
        'azúcar refinado',
        'aceites vegetales procesados',
      ],
      en: [
        'grains (wheat, rice, oats, corn)',
        'legumes',
        'dairy',
        'refined sugar',
        'processed vegetable oils',
      ],
    },
    reglasCulinarias: {
      es: 'Bases proteicas magras, frutos secos, semillas, tubérculos y abundantes hortalizas.',
      en: 'Lean protein bases, tree nuts, seeds, tubers, and abundant vegetables.',
    },
  },
  {
    id: 'Keto',
    key: 'keto',
    label: 'Cetogénica (Keto)',
    labelEn: 'Ketogenic (Keto)',
    desc: 'Muy baja en hidratos de carbono (<30g/día) y alta en grasas saludables y saciantes.',
    descEn: 'Very low carbohydrate (<30g/day) and high healthy satiating fats.',
    prohibidos: {
      es: [
        'azúcar',
        'siropes',
        'cereales',
        'legumbres',
        'tubérculos (patata, boniato)',
        'la gran mayoría de frutas dulces',
        'alimentos procesados azucarados',
      ],
      en: [
        'sugar',
        'syrups',
        'grains',
        'legumes',
        'tubers (potato, sweet potato)',
        'most sweet fruits',
        'sugary processed foods',
      ],
    },
    reglasCulinarias: {
      es: 'Enfocar en aguacate, aceites vírgenes, frutos secos bajos en carbohidratos, huevos, pescados y verduras de hoja verde.',
      en: 'Focus on avocado, virgin oils, low-carb nuts, eggs, fatty fish, and leafy green vegetables.',
    },
  },
  {
    id: 'Low Carb',
    key: 'low_carb',
    label: 'Baja en Carbohidratos (Low Carb)',
    labelEn: 'Low Carb',
    desc: 'Reducción moderada de harinas, panes y azúcares manteniendo verduras y frutas variadas.',
    descEn: 'Moderate reduction of flours, bread, and sugar while preserving vegetables and fruits.',
    prohibidos: {
      es: [
        'azúcares añadidos',
        'harinas blancas',
        'pasta blanca',
        'pan blanco',
        'dulces',
      ],
      en: [
        'added sugars',
        'white flours',
        'white pasta',
        'white bread',
        'sweets',
      ],
    },
    reglasCulinarias: {
      es: 'Sustituir pastas y arroces refinados por bases vegetales (arroz de coliflor, espirales de calabacín).',
      en: 'Substitute refined pastas and rices with vegetable bases (cauliflower rice, zucchini noodles).',
    },
  },
  {
    id: 'DASH',
    key: 'dash',
    label: 'DASH (Cardiosaludable)',
    labelEn: 'DASH (Heart-Healthy)',
    desc: 'Enfoque dietético para detener la hipertensión, rico en potasio/magnesio y bajo en sodio.',
    descEn: 'Dietary Approaches to Stop Hypertension, rich in potassium/magnesium and low sodium.',
    prohibidos: {
      es: [
        'embutidos curados',
        'conservas saladas',
        'salsas industriales',
        'panes blancos ultraprocesados',
        'exceso de sodio',
      ],
      en: [
        'cured sausages',
        'heavily salted canned foods',
        'industrial sauces',
        'ultra-processed white breads',
        'excess sodium',
      ],
    },
    reglasCulinarias: {
      es: 'Sustituir la sal de mesa por hierbas aromáticas, ajo asado, especias y ralladuras cítricas.',
      en: 'Substitute table salt with culinary herbs, roasted garlic, spices, and citrus zest.',
    },
  },
  {
    id: 'Nórdica',
    key: 'nordica',
    label: 'Dieta Nórdica',
    labelEn: 'Nordic Diet',
    desc: 'Rica en frutos del bosque, pescado graso, verduras de raíz y cereales integrales de centeno/cebada.',
    descEn: 'Rich in wild berries, fatty fish, root vegetables, and whole rye/barley grains.',
    prohibidos: {
      es: [
        'cereales refinados',
        'azúcares procesados',
      ],
      en: [
        'refined grains',
        'processed sugars',
      ],
    },
    reglasCulinarias: {
      es: 'Priorizar cocciones al horno o al vapor, bayas frescas o congeladas y aceite de colza virgen extra.',
      en: 'Prioritize oven baking or steaming, fresh or frozen berries, and cold-pressed rapeseed oil.',
    },
  },
  {
    id: 'Macrobiótica',
    key: 'macrobiotica',
    label: 'Macrobiótica',
    labelEn: 'Macrobiotic',
    desc: 'Cereales integrales ecológicos, verduras de temporada, legumbres y algas marinas.',
    descEn: 'Organic whole grains, seasonal vegetables, legumes, and sea vegetables.',
    prohibidos: {
      es: [
        'alimentos procesados',
        'azúcares refinados',
        'carnes rojas procesadas',
        'lácteos convencionales',
        'aditivos artificiales',
      ],
      en: [
        'processed foods',
        'refined sugars',
        'processed red meats',
        'conventional dairy',
        'artificial additives',
      ],
    },
    reglasCulinarias: {
      es: 'Cereales en grano entero cocidos a fuego lento, fermentos tradicionales (miso, umeboshi) y algas bien hidratadas.',
      en: 'Slow-simmered whole grains, traditional ferments (miso, umeboshi), and well-hydrated sea vegetables.',
    },
  },
];

// =============================================================================
// 4. MAPAS COMPATIBLES HACIA ATRÁS (CLINICAL_EXCLUSIONS y PATTERN_EXCLUSIONS)
// =============================================================================

export interface ClinicalModelOption {
  id: string;
  key: string;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  severidad?: SeveridadClinica;
}

export const OBJETIVOS_CLINICOS: ClinicalModelOption[] = PROTOCOLOS_CLINICOS.map((p) => ({
  id: p.id,
  key: p.key,
  label: p.label,
  labelEn: p.labelEn,
  desc: p.desc,
  descEn: p.descEn,
  severidad: p.severidad,
}));

export const PATRONES_ALIMENTARIOS: ClinicalModelOption[] = PATRONES_ALIMENTARIOS_DATA.map((p) => ({
  id: p.id,
  key: p.key,
  label: p.label,
  labelEn: p.labelEn,
  desc: p.desc,
  descEn: p.descEn,
}));

export const CLINICAL_EXCLUSIONS: Record<string, string> = PROTOCOLOS_CLINICOS.reduce(
  (acc, p) => {
    if (p.prohibidos.es.length > 0) {
      acc[p.key] = p.prohibidos.es.join(', ');
    }
    return acc;
  },
  {} as Record<string, string>
);

// Alias históricos para búsqueda retrocompatible
if (CLINICAL_EXCLUSIONS['bajo_histamina']) {
  CLINICAL_EXCLUSIONS['baja_en_histamina'] = CLINICAL_EXCLUSIONS['bajo_histamina'];
}
if (CLINICAL_EXCLUSIONS['gota']) {
  CLINICAL_EXCLUSIONS['hiperuricemia'] = CLINICAL_EXCLUSIONS['gota'];
}

export const PATTERN_EXCLUSIONS: Record<string, string> = PATRONES_ALIMENTARIOS_DATA.reduce(
  (acc, p) => {
    if (p.prohibidos.es.length > 0) {
      acc[p.key] = p.prohibidos.es.join(', ');
    }
    return acc;
  },
  {} as Record<string, string>
);

// =============================================================================
// 5. MOTOR DE RESOLUCIÓN CLÍNICA AVANZADA
// =============================================================================

export interface ClinicalProfileAnalysis {
  exclusionesTotales: string[];
  severidadMaxima: SeveridadClinica;
  reglasAvanzadasTexto: string;
  detallesPorPatologia: Array<{
    clave: string;
    nombre: string;
    severidad: SeveridadClinica;
    prohibidos: string[];
    reglasCulinarias: string;
  }>;
}

/**
 * Normaliza cualquier clave clínica a su identificador de diccionario
 */
export function normalizeClinicalKey(rawKey: string): string {
  if (!rawKey) return '';
  return rawKey
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Analiza en profundidad el perfil médico y dietético del usuario:
 * - Detecta alérgenos UE y personalizados con severidad crítica.
 * - Consolida exclusiones de patologías y patrones según el idioma solicitado.
 * - Extrae directivas culinarias y dosis-dependientes avanzadas.
 */
export function getDetailedClinicalProfile(params: {
  objetivoClinico?: string | string[];
  patronAlimentario?: string;
  alergenos?: string[];
  preferencias?: string[];
  idioma?: 'es' | 'en';
}): ClinicalProfileAnalysis {
  const idioma: 'es' | 'en' = params.idioma === 'en' ? 'en' : 'es';
  const exclusionesSet = new Set<string>();
  const detalles: ClinicalProfileAnalysis['detallesPorPatologia'] = [];
  const reglasList: string[] = [];
  let severidadMaxima: SeveridadClinica = 'moderada';

  const processedKeys = new Set<string>();

  // 1. Procesar alérgenos declarados (Tratamiento Crítico / Anafilaxia / Cero Tolerancia)
  if (params.alergenos && Array.isArray(params.alergenos)) {
    for (const rawAlergeno of params.alergenos) {
      const cleanAlergeno = (rawAlergeno || '').trim();
      if (!cleanAlergeno) continue;

      const norm = normalizeClinicalKey(cleanAlergeno);
      let matchedEU: AlergenoUE | undefined = undefined;

      for (const euAllergen of ALERGENOS_UE) {
        if (
          euAllergen.id === norm ||
          normalizeClinicalKey(euAllergen.nombre.es) === norm ||
          normalizeClinicalKey(euAllergen.nombre.en) === norm ||
          euAllergen.sinonimos.some((s) => normalizeClinicalKey(s) === norm || norm.includes(normalizeClinicalKey(s)))
        ) {
          matchedEU = euAllergen;
          break;
        }
      }

      severidadMaxima = 'critica';

      if (matchedEU) {
        if (!processedKeys.has(`allergen_${matchedEU.id}`)) {
          processedKeys.add(`allergen_${matchedEU.id}`);
          const prohibidosLang = matchedEU.exclusiones[idioma];
          prohibidosLang.forEach((item) => exclusionesSet.add(item));

          const regla =
            idioma === 'en'
              ? `Critical allergen (${matchedEU.nombre.en}): strictly zero tolerance for derivatives or cross-contamination.`
              : `Alérgeno crítico (${matchedEU.nombre.es}): tolerancia cero absoluta a derivados y contaminación cruzada.`;

          detalles.push({
            clave: matchedEU.id,
            nombre: matchedEU.nombre[idioma],
            severidad: 'critica',
            prohibidos: prohibidosLang,
            reglasCulinarias: regla,
          });
          reglasList.push(regla);
        }
      } else {
        // Alérgeno personalizado no tipado expresamente en los 14 UE
        if (!processedKeys.has(`custom_allergen_${norm}`)) {
          processedKeys.add(`custom_allergen_${norm}`);
          exclusionesSet.add(cleanAlergeno);

          const regla =
            idioma === 'en'
              ? `Custom critical allergen (${cleanAlergeno}): strictly avoid this ingredient and its direct forms.`
              : `Alérgeno crítico específico (${cleanAlergeno}): excluir terminantemente este ingrediente y sus formas directas.`;

          detalles.push({
            clave: norm,
            nombre: cleanAlergeno,
            severidad: 'critica',
            prohibidos: [cleanAlergeno],
            reglasCulinarias: regla,
          });
          reglasList.push(regla);
        }
      }
    }
  }

  // 2. Helper de procesamiento de claves de patología o patrón
  const processEntityKey = (raw: string) => {
    if (!raw) return;
    const cleanRaw = raw.trim();
    if (!cleanRaw) return;
    const norm = normalizeClinicalKey(cleanRaw);

    // Buscar en Protocolos Clínicos
    const matchingProtocol = PROTOCOLOS_CLINICOS.find(
      (p) =>
        p.id.toLowerCase() === cleanRaw.toLowerCase() ||
        p.label.toLowerCase() === cleanRaw.toLowerCase() ||
        p.labelEn.toLowerCase() === cleanRaw.toLowerCase() ||
        p.key === norm ||
        normalizeClinicalKey(p.id) === norm ||
        normalizeClinicalKey(p.label) === norm ||
        (norm.includes('histamina') && p.key === 'bajo_histamina') ||
        (norm.includes('gluten') && p.key === 'sin_gluten') ||
        (norm.includes('lactosa') && p.key === 'sin_lactosa') ||
        (norm.includes('fodmap') && p.key === 'fodmap') ||
        (norm.includes('sii') && p.key === 'sii') ||
        (norm.includes('gota') && p.key === 'gota') ||
        (norm.includes('urico') && p.key === 'gota') ||
        (norm.includes('reflujo') && p.key === 'antirreflujo') ||
        (norm.includes('gastritis') && p.key === 'antirreflujo') ||
        (norm.includes('blanda') && p.key === 'dieta_blanda') ||
        (norm.includes('diabetes') && p.key === 'diabetes_tipo_2') ||
        (norm.includes('hipertension') && p.key === 'dash') ||
        (norm.includes('colesterol') && p.key === 'hipercolesterolemia') ||
        (norm.includes('antiinflamat') && p.key === 'antiinflamatorio')
    );

    if (matchingProtocol && !processedKeys.has(`protocol_${matchingProtocol.key}`)) {
      processedKeys.add(`protocol_${matchingProtocol.key}`);

      if (matchingProtocol.severidad === 'critica') {
        severidadMaxima = 'critica';
      }

      const prohibidosLang = matchingProtocol.prohibidos[idioma];
      prohibidosLang.forEach((item) => exclusionesSet.add(item));

      const regla = matchingProtocol.reglasCulinarias[idioma];
      if (regla) {
        reglasList.push(`[${matchingProtocol[idioma === 'en' ? 'labelEn' : 'label']}]: ${regla}`);
      }

      detalles.push({
        clave: matchingProtocol.key,
        nombre: idioma === 'en' ? matchingProtocol.labelEn : matchingProtocol.label,
        severidad: matchingProtocol.severidad,
        prohibidos: prohibidosLang,
        reglasCulinarias: regla,
      });
    }

    // Buscar en Patrones Alimentarios
    const matchingPattern = PATRONES_ALIMENTARIOS_DATA.find(
      (pa) =>
        pa.id.toLowerCase() === cleanRaw.toLowerCase() ||
        pa.label.toLowerCase() === cleanRaw.toLowerCase() ||
        pa.labelEn.toLowerCase() === cleanRaw.toLowerCase() ||
        pa.key === norm ||
        normalizeClinicalKey(pa.id) === norm ||
        normalizeClinicalKey(pa.label) === norm
    );

    if (matchingPattern && !processedKeys.has(`pattern_${matchingPattern.key}`)) {
      processedKeys.add(`pattern_${matchingPattern.key}`);

      const prohibidosLang = matchingPattern.prohibidos[idioma];
      prohibidosLang.forEach((item) => exclusionesSet.add(item));

      const regla = matchingPattern.reglasCulinarias[idioma];
      if (regla) {
        reglasList.push(`[${matchingPattern[idioma === 'en' ? 'labelEn' : 'label']}]: ${regla}`);
      }

      detalles.push({
        clave: matchingPattern.key,
        nombre: idioma === 'en' ? matchingPattern.labelEn : matchingPattern.label,
        severidad: 'moderada',
        prohibidos: prohibidosLang,
        reglasCulinarias: regla,
      });
    }
  };

  if (params.objetivoClinico) {
    if (Array.isArray(params.objetivoClinico)) {
      params.objetivoClinico.forEach((obj) => {
        if (obj) processEntityKey(obj);
      });
    } else {
      processEntityKey(params.objetivoClinico);
    }
  }
  if (params.patronAlimentario) processEntityKey(params.patronAlimentario);

  if (params.preferencias && Array.isArray(params.preferencias)) {
    params.preferencias.forEach((pref) => processEntityKey(pref));
  }

  const exclusionesTotales = Array.from(exclusionesSet).filter(Boolean);
  const uniqueReglas = Array.from(new Set(reglasList));
  const reglasAvanzadasTexto = uniqueReglas.join('\n');

  return {
    exclusionesTotales,
    severidadMaxima,
    reglasAvanzadasTexto,
    detallesPorPatologia: detalles,
  };
}

/**
 * Cruza las preferencias del usuario y alérgenos con el diccionario clínico
 * para obtener una lista consolidada y deduplicada de ingredientes estrictamente prohibidos.
 * (Función retrocompatible: mantiene firma original devolviendo string[])
 */
export function getClinicalExclusions(params: {
  objetivoClinico?: string | string[];
  patronAlimentario?: string;
  preferencias?: string[];
  alergenos?: string[];
  idioma?: 'es' | 'en';
}): string[] {
  const profile = getDetailedClinicalProfile(params);
  return profile.exclusionesTotales;
}

export interface ClinicalConflict {
  ingredienteOriginal: string;
  prohibidoDetectado: string;
  severidad: SeveridadClinica;
  patologia: string;
}

export interface ClinicalCompatibilityReport {
  isCompatible: boolean;
  conflicts: ClinicalConflict[];
  severidadMaxima?: SeveridadClinica;
  totalExclusiones: number;
  patologiasEvaluadas: string[];
}

/**
 * Normaliza una cadena culinaria eliminando tildes y diacríticos para búsqueda robusta
 */
export function normalizeClinicalTerm(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Obtiene la raíz o lema singular de un término culinario (ES y EN)
 */
export function getSingularStem(term: string): string {
  const w = (term || '').trim();
  if (w.endsWith('ces') && w.length > 4) return w.slice(0, -3) + 'z'; // nueces -> nuez
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2); // champinones -> champinon, frijoles -> frijol
  if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss')) return w.slice(0, -1); // garbanzos -> garbanzo
  return w;
}

/**
 * Evalúa si un nombre de ingrediente coincide con un término prohibido clínico.
 * Maneja búsqueda de frases compuestas, lematización singular/plural y excepciones culinarias seguras.
 */
export function isIngredientMatchingProhibited(
  rawIngName: string,
  prohibido: string,
  patologiaClave?: string
): boolean {
  const normIng = normalizeClinicalTerm(rawIngName);
  // Limpiar anotaciones aclaratorias entre paréntesis (ej: "cebolla (bulbo blanco)" -> "cebolla")
  const cleanProhibido = prohibido.replace(/\s*\([^)]*\)/g, '').trim();
  const normP = normalizeClinicalTerm(cleanProhibido);

  if (!normP || normP.length < 2) return false;

  // EXCEPCIONES CULINARIAS SEGURAS (Prevención de falsos positivos):
  // 1. Trigo sarraceno (alforfón): pseudocereal 100% libre de gluten.
  if ((normP === 'trigo' || normP === 'gluten') && normIng.includes('trigo sarraceno')) {
    const withoutSarraceno = normIng.replace(/trigo\s+sarraceno/gi, '').trim();
    if (!/\btrigo\b/i.test(withoutSarraceno)) {
      return false;
    }
  }

  // 2. Aceite infusionado de ajo/cebolla en protocolo FODMAP / SII:
  // Los fructanos son hidrosolubles y no liposolubles, por lo que el aceite infusionado es apto.
  if (
    (patologiaClave === 'fodmap' || patologiaClave === 'sii') &&
    (normP === 'ajo' || normP === 'cebolla') &&
    (normIng.includes('aceite infusionado') || normIng.includes('garlic infused oil') || normIng.includes('infused oil'))
  ) {
    return false;
  }

  // A) Término prohibido de múltiples palabras (ej: "leche evaporada", "harina de trigo", "cebolla dulce")
  if (normP.includes(' ')) {
    const escaped = normP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const multiRegex = new RegExp(`(^|[\\s,;./()])${escaped}($|[\\s,;./()])`, 'i');
    return multiRegex.test(normIng);
  }

  // B) Término prohibido de palabra simple (ej: "garbanzo", "cebolla", "leche", "ajo")
  const stem = getSingularStem(normP);
  const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const singleRegex = new RegExp(
    `(^|[\\s,;./()])${escapedStem}(s|es|itas?|itos?|tas?|tos?)?($|[\\s,;./()])`,
    'i'
  );

  return singleRegex.test(normIng);
}

/**
 * Evalúa los ingredientes de una receta frente al perfil clínico y alérgenos del usuario,
 * identificando con precisión quirúrgica los ingredientes en conflicto y la severidad asociada.
 */
export function checkRecipeClinicalCompatibility(
  ingredientes: Array<{ nombre_limpio?: string | null; nombre_crudo?: string | null }>,
  profileParams: {
    objetivoClinico?: string | string[];
    patronAlimentario?: string;
    preferencias?: string[];
    alergenos?: string[];
    idioma?: 'es' | 'en';
  }
): ClinicalCompatibilityReport {
  const profile = getDetailedClinicalProfile(profileParams);

  if (profile.exclusionesTotales.length === 0 || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    return {
      isCompatible: true,
      conflicts: [],
      totalExclusiones: 0,
      patologiasEvaluadas: [],
    };
  }

  const patologiasEvaluadas = profile.detallesPorPatologia.map((d) => d.nombre);
  const conflicts: ClinicalConflict[] = [];

  for (const ing of ingredientes) {
    const rawName = (ing.nombre_limpio || ing.nombre_crudo || '').trim();
    if (!rawName) continue;

    for (const det of profile.detallesPorPatologia) {
      // Ordenar prohibidos por longitud descendente para emparejar términos específicos primero (ej: "leche evaporada" antes de "leche")
      const sortedProhibidos = [...det.prohibidos].sort((a, b) => b.length - a.length);

      for (const prohibido of sortedProhibidos) {
        if (isIngredientMatchingProhibited(rawName, prohibido, det.clave)) {
          const alreadyMatchedInThisPathology = conflicts.some(
            (c) =>
              c.ingredienteOriginal.toLowerCase() === rawName.toLowerCase() &&
              c.patologia === det.nombre
          );

          if (!alreadyMatchedInThisPathology) {
            conflicts.push({
              ingredienteOriginal: rawName,
              prohibidoDetectado: prohibido,
              severidad: det.severidad,
              patologia: det.nombre,
            });
            // Una vez emparejado el término más específico para esta patología en este ingrediente, pasar a la siguiente patología
            break;
          }
        }
      }
    }
  }

  const hasCritical = conflicts.some((c) => c.severidad === 'critica');
  const severidadMaxima: SeveridadClinica = hasCritical
    ? 'critica'
    : conflicts.length > 0
    ? 'moderada'
    : profile.severidadMaxima;

  return {
    isCompatible: conflicts.length === 0,
    conflicts,
    severidadMaxima,
    totalExclusiones: profile.exclusionesTotales.length,
    patologiasEvaluadas,
  };
}

/**
 * Formatea la cláusula de cortafuegos clínico lista para ser inyectada en el prompt de Gemini.
 * Incorpora nivel de severidad y directivas culinarias/dosis-dependientes avanzadas si se proporcionan.
 */
export function buildClinicalFirewallPrompt(
  exclusions: string[],
  lang: 'es' | 'en' = 'es',
  options?: {
    severidadMaxima?: SeveridadClinica;
    reglasAvanzadasTexto?: string;
  }
): string {
  if (!exclusions || exclusions.length === 0) return '';

  const exclusionsList = exclusions.join(', ');
  const esCritico = options?.severidadMaxima === 'critica';
  const reglasTexto = options?.reglasAvanzadasTexto?.trim();

  if (lang === 'en') {
    const sevLabel = esCritico
      ? 'CRITICAL SAFETY LEVEL (ANAPHYLAXIS / CELIAC ZERO-TOLERANCE)'
      : 'MODERATE SAFETY LEVEL (CLINICAL & DOSE-DEPENDENT)';
    const advancedSection = reglasTexto
      ? `\nADVANCED CLINICAL RULES & DOSE MANAGEMENT:\n${reglasTexto}`
      : '';

    return `CLINICAL FIREWALL & MEDICAL SAFETY DIRECTIVE:
SAFETY LEVEL: ${sevLabel}
ESTRICTAMENTE PROHIBIDO sugerir los siguientes ingredientes: [${exclusionsList}].
Zero tolerance: you MUST NEVER include, suggest or prescribe any of these prohibited items or derivatives in the recipe ingredients, steps or tips. Always replace them with culinary and nutritionally sound alternatives 100% safe for this clinical profile.${advancedSection}`;
  }

  const sevLabel = esCritico
    ? 'NIVEL DE SEGURIDAD CRÍTICO (TOLERANCIA CERO ALERGÉNICA / CELIAQUÍA)'
    : 'NIVEL DE SEGURIDAD MODERADO (CLÍNICO Y DOSIS-DEPENDIENTE)';
  const advancedSection = reglasTexto
    ? `\nDIRECTIVAS CULINARIAS CLÍNICAS Y DOSIFICACIÓN:\n${reglasTexto}`
    : '';

  return `CORTAFUEGOS CLÍNICO Y SEGURIDAD MÉDICA OBLIGATORIA:
NIVEL DE SEGURIDAD: ${sevLabel}
ESTRICTAMENTE PROHIBIDO sugerir los siguientes ingredientes: [${exclusionsList}].
Tolerancia cero: está TERMINANTEMENTE PROHIBIDO incluir o sugerir cualquiera de estos ingredientes prohibidos o sus derivados directos en los ingredientes, pasos o consejos de la receta. Sustitúyelos por alternativas culinarias y nutricionales 100% seguras.${advancedSection}`;
}
