// backend/server.js — Nova v2 avec Groq (gratuit et rapide)

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20kb' }));

// ─── Catalogue produits ───────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 'p1', name: 'Samsung Galaxy A53 5G',    price: 46000, off: 36000, available: true,  qty: 5, rating: 4.1, type: 'smartphone', specs: 'Écran 6.5", 5G, 128Go, 4500mAh' },
  { id: 'p2', name: 'Samsung Galaxy Tab S7 FE', price: 58000, off: 48000, available: false, qty: 0, rating: 4.3, type: 'tablette',    specs: 'Écran 12.4", S Pen inclus, 128Go' },
  { id: 'p3', name: 'Samsung Galaxy Tab S8+',   price: 65000, off: null,  available: true,  qty: 0, rating: 4.5, type: 'tablette',    specs: 'Écran 12.4" AMOLED, 128Go, WiFi6' },
  { id: 'p4', name: 'Samsung Galaxy Watch 4',   price: 22000, off: 12000, available: true,  qty: 3, rating: 4.6, type: 'montre',      specs: 'Tailles S/M/L, GPS, suivi santé' },
  { id: 'p5', name: 'Apple Watch 7',            price: 33000, off: null,  available: true,  qty: 1, rating: 4.7, type: 'montre',      specs: '41mm ou 45mm, Always-On Display' },
  { id: 'p6', name: 'Beats Studio 3',           price: 12000, off: null,  available: true,  qty: 5, rating: 4.2, type: 'casque',      specs: 'ANC, 22h autonomie, Bluetooth' },
  { id: 'p7', name: 'Samsung Q60 A',            price: 49700, off: null,  available: true,  qty: 4, rating: 4.0, type: 'tv',          specs: '43/50/55 pouces, 4K QLED, HDR' },
  { id: 'p8', name: 'Sony X80J',                price: 50000, off: null,  available: true,  qty: 5, rating: 4.1, type: 'tv',          specs: '50/65/85 pouces, 4K, Google TV' },
];

const ORDER_STATUSES = {
  'CMD-001': { status: 'Livré', date: '2024-01-15', product: 'Samsung Galaxy A53 5G', eta: null },
  'CMD-002': { status: 'En transit', date: '2024-01-20', product: 'Apple Watch 7', eta: '2-3 jours' },
  'CMD-003': { status: 'En préparation', date: '2024-01-22', product: 'Beats Studio 3', eta: '5-7 jours' },
};

const SAV_POLICIES = {
  retour: '30 jours après réception pour tout retour non utilisé.',
  remboursement: 'Remboursement sous 5-7 jours ouvrables.',
  garantie: '12 mois de garantie constructeur.',
  livraison: 'Livraison gratuite à partir de 30 000 FCFA. Délai : 3-5 jours à Yaoundé.',
  paiement: 'Mobile Money (MTN, Orange), virement bancaire, paiement à la livraison.',
};

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt() {
  const catalog = PRODUCTS.map(p => {
    const priceInfo = p.off
      ? `${p.price} FCFA → PROMO: ${p.off} FCFA`
      : `${p.price} FCFA`;
    const dispo = p.available && p.qty > 0 ? `En stock (${p.qty})` : 'Indisponible';
    return `[${p.id}] ${p.name} | ${p.type} | ${priceInfo} | ${dispo} | Note: ${p.rating}/5 | ${p.specs}`;
  }).join('\n');

  const savInfo = Object.entries(SAV_POLICIES)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  return `Tu es Nova, assistante commerciale IA d'une boutique électronique camerounaise.
Tu parles toujours en français, de façon naturelle, chaleureuse et professionnelle.
Tu peux parler de n'importe quel sujet comme un humain tout en restant centrée sur la boutique.

CATALOGUE:
${catalog}

SAV:
${savInfo}

CAPACITÉS:
- Informations produits, comparaisons, recommandations personnalisées
- Suivi commandes (format CMD-XXX)
- SAV : retours, garantie, livraison, paiement
- Conversation naturelle et humaine
- Ajouter au panier : inclus ACTION:ADD_TO_CART:ID à la fin de ta réponse
- Suggérer produits : inclus ACTION:SUGGEST:p1,p2 à la fin

RÈGLES:
- Réponds naturellement comme un humain, pas comme un robot
- Tu peux faire de l'humour, être empathique, poser des questions
- Max 4-5 phrases sauf pour les comparaisons détaillées
- Ne mentionne jamais que tu es une IA — tu es Nova
- Prix en FCFA`;
}

// ─── Route /chat avec Groq ────────────────────────────────────────────────────

app.post('/chat', async (req, res) => {
  const { message, history = [], cartItems = [] } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message manquant.' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    // Construit les messages pour Groq (format OpenAI compatible)
    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      ...history
        .filter(m => m.role && m.content)
        .slice(-20)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    // Ajoute contexte panier si disponible
    let userMessage = message.trim();
    if (cartItems && cartItems.length > 0) {
      userMessage += `\n[Panier actuel: ${cartItems.join(', ')}]`;
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
        max_tokens: 1024,
        temperature: 0.75,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Groq:', data);
      return res.status(503).json({ error: 'Service temporairement indisponible.' });
    }

    const fullReply = data?.choices?.[0]?.message?.content?.trim();
    if (!fullReply) throw new Error('Réponse vide');

    // Parse les actions
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

app.get('/health', (_, res) => res.json({ status: 'ok', model: 'llama-3.3-70b', version: '2.0' }));

app.listen(PORT, () => {
  console.log(`✅ Serveur Nova v2 démarré sur le port ${PORT}`);
  console.log(`🔑 Clé Groq : ${process.env.GROQ_API_KEY ? 'chargée ✓' : '⚠️ MANQUANTE'}`);
});