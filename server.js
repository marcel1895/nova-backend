// backend/server.js — Nova v3 : comparaisons, budget, SAV complet

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20kb' }));

// ─── Catalogue produits ───────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 'p1', name: 'Samsung Galaxy A53 5G',    price: 46000, off: 36000, available: true,  qty: 5, rating: 4.1, type: 'smartphone', specs: 'Écran 6.5" FHD+, 5G, 128Go, 4500mAh, Android 12, Quad caméra 64MP' },
  { id: 'p2', name: 'Samsung Galaxy Tab S7 FE', price: 58000, off: 48000, available: false, qty: 0, rating: 4.3, type: 'tablette',    specs: 'Écran 12.4" TFT, S Pen inclus, 128Go, WiFi, Snapdragon 750G' },
  { id: 'p3', name: 'Samsung Galaxy Tab S8+',   price: 65000, off: null,  available: true,  qty: 0, rating: 4.5, type: 'tablette',    specs: 'Écran 12.4" AMOLED 120Hz, 128Go, WiFi6, Snapdragon 8 Gen1, S Pen inclus' },
  { id: 'p4', name: 'Samsung Galaxy Watch 4',   price: 22000, off: 12000, available: true,  qty: 3, rating: 4.6, type: 'montre',      specs: 'GPS intégré, suivi santé complet, ECG, SpO2, IP68, autonomie 40h, Android' },
  { id: 'p5', name: 'Apple Watch 7',            price: 33000, off: null,  available: true,  qty: 1, rating: 4.7, type: 'montre',      specs: 'Always-On Display, GPS, ECG, SpO2, IP6X, recharge rapide, iOS uniquement' },
  { id: 'p6', name: 'Beats Studio 3',           price: 12000, off: null,  available: true,  qty: 5, rating: 4.2, type: 'casque',      specs: 'Réduction bruit active (ANC), 22h autonomie, Bluetooth 5.0, Pure ANC, pliable' },
  { id: 'p7', name: 'Samsung Q60 A',            price: 49700, off: null,  available: true,  qty: 4, rating: 4.0, type: 'tv',          specs: '4K QLED, HDR10+, Smart TV Tizen, 43/50/55 pouces, HDR, Alexa intégré' },
  { id: 'p8', name: 'Sony X80J',                price: 50000, off: null,  available: true,  qty: 5, rating: 4.1, type: 'tv',          specs: '4K HDR, Google TV, Dolby Audio, 50/65/85 pouces, HDMI 2.0, Google Assistant' },
];

const ORDER_STATUSES = {
  'CMD-001': { status: 'Livré ✅', date: '2024-01-15', product: 'Samsung Galaxy A53 5G', eta: null },
  'CMD-002': { status: 'En transit 🚚', date: '2024-01-20', product: 'Apple Watch 7', eta: '2-3 jours' },
  'CMD-003': { status: 'En préparation 📦', date: '2024-01-22', product: 'Beats Studio 3', eta: '5-7 jours' },
};

// ─── System prompt enrichi ────────────────────────────────────────────────────

function buildSystemPrompt() {
  const catalog = PRODUCTS.map(p => {
    const priceInfo = p.off
      ? `Prix normal: ${p.price} FCFA | Prix PROMO: ${p.off} FCFA (économie: ${p.price - p.off} FCFA)`
      : `Prix: ${p.price} FCFA`;
    const dispo = p.available && p.qty > 0
      ? `✅ DISPONIBLE (${p.qty} en stock)`
      : '❌ INDISPONIBLE';
    return `[${p.id}] ${p.name}
   Catégorie: ${p.type}
   ${priceInfo}
   Stock: ${dispo}
   Note: ${p.rating}/5 ⭐
   Specs: ${p.specs}`;
  }).join('\n\n');

  return `Tu es Nova, une assistante commerciale IA experte pour TechShop, une boutique électronique camerounaise.
Tu parles TOUJOURS en français, de façon naturelle, chaleureuse et professionnelle comme un vrai vendeur humain.
Tu ne mentionnes JAMAIS que tu es une IA ou un modèle de langage.

━━━ CATALOGUE COMPLET ━━━
${catalog}

━━━ POLITIQUE COMMERCIALE ━━━
- Livraison: GRATUITE dès 30 000 FCFA, 3-5 jours à Yaoundé, 5-8 jours autres villes
- Paiement: MTN Mobile Money, Orange Money, virement bancaire, paiement à la livraison
- Retour: 30 jours après réception, produit non utilisé dans emballage original
- Remboursement: 5-7 jours ouvrables après réception du retour
- Garantie: 12 mois constructeur sur TOUS les produits
- SAV: WhatsApp +237 6XX XXX XXX, lundi-samedi 8h-18h

━━━ TES COMPÉTENCES PRINCIPALES ━━━

1. COMPARAISON DE PRODUITS:
   Quand on te demande de comparer des produits, fais un tableau clair:
   - Compare prix, specs, disponibilité, note, avantages et inconvénients
   - Donne une recommandation finale selon le profil du client
   - Exemple: "Comparer Samsung Watch 4 vs Apple Watch 7"
   → Prix: Samsung 12 000 FCFA (promo) vs Apple 33 000 FCFA
   → Samsung: compatible Android uniquement ✓, GPS, ECG, meilleur prix
   → Apple: compatible iOS uniquement, design premium, Always-On Display
   → Recommandation: Samsung si budget limité + Android, Apple si iPhone + budget confortable

2. RECOMMANDATION PAR BUDGET:
   Quand quelqu'un donne un budget, propose UNIQUEMENT les produits dans ce budget:
   - Budget ≤ 12 000 FCFA → Beats Studio 3 (12 000 FCFA)
   - Budget ≤ 12 000 FCFA (promo) → Samsung Galaxy Watch 4 (12 000 FCFA promo)
   - Budget ≤ 33 000 FCFA → Apple Watch 7 (33 000 FCFA)
   - Budget ≤ 36 000 FCFA → Samsung Galaxy A53 5G (36 000 FCFA promo)
   - Budget ≤ 48 000 FCFA → Samsung Tab S7 FE (48 000 FCFA promo, mais indisponible)
   - Budget ≤ 50 000 FCFA → Sony X80J ou Samsung Q60A
   - Budget > 50 000 FCFA → Samsung Galaxy Tab S8+ (65 000 FCFA)
   
   Demande TOUJOURS l'usage prévu avant de recommander (travail, gaming, sport, cadeau?)
   Si le budget ne correspond à aucun produit disponible, dis-le clairement et propose le plus proche

3. RECOMMANDATIONS PERSONNALISÉES:
   - Pour le sport/fitness → Samsung Galaxy Watch 4 (GPS, suivi santé, IP68)
   - Pour les étudiants → Samsung Galaxy A53 5G (bon rapport qualité/prix)
   - Pour le travail/productivité → Samsung Tab S8+ ou Tab S7 FE (grand écran, S Pen)
   - Pour la musique → Beats Studio 3 (ANC, 22h autonomie)
   - Pour regarder des films → Sony X80J ou Samsung Q60A (4K)
   - Pour cadeau → demande le budget et le profil du destinataire

4. SAV COMPLET:
   - Produit défectueux → "Contactez-nous sur WhatsApp +237 6XX XXX XXX avec photo du défaut"
   - Retour → "Vous avez 30 jours. Emballez le produit et contactez-nous pour l'enlèvement"
   - Remboursement → "Traitement sous 5-7 jours ouvrables après réception du retour"
   - Garantie → "12 mois constructeur. Couvre défauts de fabrication, pas les dommages accidentels"

5. ACTIONS PANIER:
   Pour ajouter au panier, inclus à la fin: ACTION:ADD_TO_CART:ID_PRODUIT
   Pour suggérer des produits: ACTION:SUGGEST:p1,p4,p6

━━━ RÈGLES DE CONVERSATION ━━━
- Réponds de façon conversationnelle et naturelle
- Pour les comparaisons: sois précis et structuré avec des tableaux ou listes claires
- Pour les budgets: propose TOUJOURS 2-3 options si possible
- Pose des questions pour mieux cerner les besoins du client
- Si un produit est indisponible, propose TOUJOURS une alternative disponible
- Utilise des emojis avec modération pour rendre la conversation plus vivante
- Max 5-6 phrases pour les réponses simples, plus long pour les comparaisons détaillées
- Les prix sont TOUJOURS en FCFA`;
}

// ─── Route /chat ──────────────────────────────────────────────────────────────

app.post('/chat', async (req, res) => {
  const { message, history = [], cartItems = [] } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message manquant.' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      ...history
        .filter(m => m.role && m.content)
        .slice(-30)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    let userMessage = message.trim();
    if (cartItems && cartItems.length > 0) {
      userMessage += `\n[Panier actuel du client: ${cartItems.join(', ')}]`;
    }
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Groq:', JSON.stringify(data));
      return res.status(503).json({ error: 'Service temporairement indisponible.' });
    }

    const fullReply = data?.choices?.[0]?.message?.content?.trim();
    if (!fullReply) throw new Error('Réponse vide');

    const lines = fullReply.split('\n');
    const actionLines = lines.filter(l => l.startsWith('ACTION:'));
    const replyText = lines.filter(l => !l.startsWith('ACTION:')).join('\n').trim();

    const actions = actionLines.map(line => {
      const parts = line.split(':');
      if (parts[1] === 'ADD_TO_CART') {
        const product = PRODUCTS.find(p => p.id === parts[2]);
        return { type: 'ADD_TO_CART', productId: parts[2], product };
      }
      if (parts[1] === 'SUGGEST') {
        const ids = parts[2].split(',');
        const products = ids.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
        return { type: 'SUGGEST', products };
      }
      return null;
    }).filter(Boolean);

    return res.json({ reply: replyText, actions });

  } catch (error) {
    console.error('Erreur serveur:', error.message);
    return res.status(503).json({ error: 'Erreur serveur.' });
  }
});

// ─── Suivi commande ───────────────────────────────────────────────────────────

app.get('/order/:id', (req, res) => {
  const order = ORDER_STATUSES[req.params.id.toUpperCase()];
  if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
  return res.json(order);
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({
  status: 'ok',
  model: 'llama-3.3-70b-versatile',
  version: '3.0',
  features: ['comparaison', 'budget', 'SAV', 'panier', 'recommandations']
}));

app.listen(PORT, () => {
  console.log(`✅ Serveur Nova v3 démarré sur le port ${PORT}`);
  console.log(`🔑 Clé Groq : ${process.env.GROQ_API_KEY ? 'chargée ✓' : '⚠️ MANQUANTE'}`);
});