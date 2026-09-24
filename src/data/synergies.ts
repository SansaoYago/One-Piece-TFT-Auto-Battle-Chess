import { SynergyDef, TraitId } from '../types/game';

export const SYNERGY_DATABASE: Record<TraitId, SynergyDef> = {
  brigao: {
    id: 'brigao',
    name: 'Brigão',
    icon: '🥊',
    color: '#EF4444',
    description: 'Unidades drenam HP ao causar dano e cada ataque básico aumenta a velocidade de ataque acumulativamente.',
    tiers: [
      { count: 2, description: '(2) +25% Roubo de Vida, +15% Velocidade de Ataque cumulativa.' },
      { count: 3, description: '(3) +35% Roubo de Vida, +20% Velocidade de Ataque cumulativa.' },
      { count: 4, description: '(4) +40% Roubo de Vida, +25% Velocidade de Ataque cumulativa.' },
      { count: 5, description: '(5) +50% Roubo de Vida, ATK Speed fixado, Dano Básico +340% e 100% Crítico.' },
      { count: 6, description: '(6) +60% Roubo de Vida e ataques básicos causam Dano Colossal em Grande Área (AOE Cleave).' },
    ],
  },
  espadachim: {
    id: 'espadachim',
    name: 'Espadachim',
    icon: '⚔️',
    color: '#10B981',
    description: 'Espadachins possuem chance de desferir ataques duplos rápidos e perfurar defesas.',
    tiers: [
      { count: 2, description: '(2) 30% de chance de desferir um ataque duplo extra.' },
      { count: 4, description: '(4) 65% de chance de ataque duplo extra e ignora 20% da armadura do alvo.' },
    ],
  },
  paramecia: {
    id: 'paramecia',
    name: 'Paramecia',
    icon: '🌀',
    color: '#A855F7',
    description: 'Usuários de Frutas Paramecia ganham resistência a dano e carga de mana inicial.',
    tiers: [
      { count: 2, description: '(2) +25% de resistência a dano contínuo e ganho de +15 de mana inicial.' },
    ],
  },
  logia: {
    id: 'logia',
    name: 'Logia',
    icon: '🔥',
    color: '#F97316',
    description: 'Usuários de Logia tornam seus corpos elementos puros com chance de intangibilidade.',
    tiers: [
      { count: 2, description: '(2) 20% de chance de intangibilidade (ataques físicos erram completamente).' },
    ],
  },
  zoan: {
    id: 'zoan',
    name: 'Zoan / Mítica',
    icon: '🐾',
    color: '#3B82F6',
    description: 'Transformações animais com grande resistência e recuperação vital em combate.',
    tiers: [
      { count: 2, description: '(2) Ao sofrer dano fatal pela 1ª vez, regeneram 40% do HP máx e ganham +30% de dano.' },
    ],
  },
  navegadora: {
    id: 'navegadora',
    name: 'Navegadora',
    icon: '🧭',
    color: '#0EA5E9',
    description: 'Especialista em climatologia marítima e navegação das correntes oceânicas da Grand Line.',
    tiers: [],
  },
  shichibukai: {
    id: 'shichibukai',
    name: 'Shichibukai',
    icon: '👑',
    color: '#D97706',
    description: 'Corsários do Governo Mundial com habilidades que anulam sustentação inimiga.',
    tiers: [
      { count: 2, description: '(2) Inimigos atingidos por habilidades sofrem redução permanente de 20% em curas e escudos.' },
    ],
  },
  ladrao: {
    id: 'ladrao',
    name: 'Ladrão / Pirata Saqueador',
    icon: '🍊',
    color: '#EAB308',
    description: 'Mestres em furtos ousados e saques de tesouros dos mares.',
    tiers: [
      { count: 2, description: '(2) Em combate, unidades Ladrão têm chance de saquear 30% das moedas do oponente (máximo 1 saque por round).' },
      { count: 4, description: '(4) Em combate, 60% de chance de saquear 50% das moedas OU 15% de chance de roubar um Item Equipado do adversário (vai direto pro Baú! Máximo 1 saque por round).' },
    ],
  },
  medroso: {
    id: 'medroso',
    name: 'Medroso',
    icon: '🏃',
    color: '#84CC16',
    description: 'Instinto de sobrevivência apurado com saltos defensivos.',
    tiers: [
      { count: 2, description: '(2) Ao sofrer golpe direto, 35% de chance de recuar 1 casa esquivando do golpe.' },
    ],
  },
  crush: {
    id: 'crush',
    name: 'Crush Encantador',
    icon: '💖',
    color: '#EC4899',
    description: 'Beleza estonteante que desestabiliza combatentes masculinos.',
    tiers: [
      { count: 1, description: '(1) Oponentes masculinos ou traços cômicos têm seu dano contra a unidade reduzido em 50%.' },
    ],
  },
  haki: {
    id: 'haki',
    name: 'Haki Lendário',
    icon: '⚡',
    color: '#E11D48',
    description: 'Domínio supremo das três forças espirituais (Observação, Armamento e Conquistador).',
    tiers: [
      { count: 1, description: '(1) Ataques nunca erram e causam Dano Puro contínuo ignorando 100% das defesas.' },
    ],
  },
  suporte: {
    id: 'suporte',
    name: 'Suporte',
    icon: '🩺',
    color: '#06B6D4',
    description: 'Especialistas cirúrgicos e médicos que prestam socorro imediato, aumentam sustentação e purificam aliados.',
    tiers: [
      { count: 1, description: '(1) Unidades de Suporte aumentam suas curas em 25% e aliados recebem +150 de Vida Máxima.' },
      { count: 2, description: '(2) Curas e escudos aumentados em 50%. Ao conjurar habilidades médicas, purificam todos os debuffs negativos (lentidão, sangramento e atordoamento) de aliados na área.' },
    ],
  },
  mink: {
    id: 'mink',
    name: 'Minks',
    icon: '⚡',
    color: '#38BDF8',
    description: 'Guerreiros da Tribo Mink que canalizam eletricidade natural "Electro" em seus ataques corpo a corpo.',
    tiers: [
      { count: 1, description: '(1) Ataques aplicam Electro: causam +50 de Dano Mágico bônus e reduzem a velocidade de ataque do alvo em 15% por 2s.' },
      { count: 2, description: '(2) Electro causa +120 de Dano Mágico bônus. A cada 3 ataques básicos, descarregam um choque elétrico que atordoa o alvo por 0.8s.' },
      { count: 4, description: '(4) Minks despertam a forma Sulong: +60% de Velocidade de Ataque, 25% de Roubo de Vida e raios Electro encadeados para 2 inimigos adjacentes.' },
    ],
  },
};
