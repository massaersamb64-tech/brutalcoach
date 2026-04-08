const BRUTAL = {
  start: [
    "Arrête de procrastiner. Le timer tourne.",
    "T'as encore perdu du temps. Maintenant tu travailles.",
    "La discipline, c'est pas une option. Lance-toi.",
    "Chaque seconde passée sans travailler est une seconde perdue. Go.",
  ],
  productive: [
    "Continue. Ne t'arrête pas maintenant.",
    "Bien. Garde ce rythme, c'est tout ce qu'on te demande.",
    "C'est ça. Reste focus.",
    "Tu travailles enfin. Maintiens ça.",
  ],
  distraction: [
    "CONCENTRE-TOI. Chaque seconde compte.",
    "Tu te disperses encore. Reviens au travail immédiatement.",
    "Ce n'est pas le moment. Focus.",
    "La distraction, c'est l'ennemi. Reprends-toi.",
    "Tu viens de perdre du temps. Ça s'arrête maintenant.",
  ],
  lowScore: [
    "Ton score est honteux. Tu peux faire mieux que ça.",
    "50% de productivité ? Vraiment ? Tu vaux plus que ça.",
    "Les gens qui réussissent ne font pas ça. Reprends-toi.",
    "Ce niveau n'est pas acceptable. Remonte-toi les manches.",
  ],
  midScore: [
    "Moyen. C'est pas suffisant pour atteindre tes objectifs.",
    "Tu peux faire mieux. Ce niveau ne te distingue pas.",
    "Bien mais pas assez. Pousse plus fort.",
  ],
  highScore: [
    "Impressionnant. Continue à ce niveau.",
    "90%+ ? C'est du vrai travail. Maintiens ça.",
    "Tu commences à comprendre ce que c'est la discipline.",
    "Voilà ce qu'on attend de toi. Ne lâche pas.",
  ],
  pause: [
    "La pause dure combien de temps ? Reprends.",
    "Le monde n'attend pas pendant ta pause.",
    "Fais vite. T'as des objectifs à atteindre.",
  ],
  goal_reached: [
    "Objectif du jour atteint. Maintenant dépasse-le.",
    "Mission accomplie. Tu te croyais capable, tu l'es. Maintenant va plus loin.",
  ],
  idle: [
    "Qu'est-ce que tu attends ? Lance une session.",
    "Chaque heure passée sans travailler est du retard accumulé.",
    "Tu es là mais tu ne travailles pas. Ça ne compte pas.",
  ],
}

const ENCOURAGE = {
  start: [
    "C'est parti ! Tu vas faire quelque chose d'incroyable aujourd'hui.",
    "Chaque grand accomplissement commence par un premier pas. C'est maintenant !",
    "Tu as ce qu'il faut. Allons-y ensemble.",
    "Une nouvelle session, une nouvelle opportunité. Tu peux le faire !",
  ],
  productive: [
    "Excellent travail ! Tu es dans la zone.",
    "Continue comme ça, tu es brillant !",
    "Chaque minute compte. Tu fais du super travail.",
    "Tu es en train de construire ton futur. Continue !",
  ],
  distraction: [
    "Oups ! Recentre-toi doucement. Tu peux le faire.",
    "Ce n'est pas grave. Respire et reviens au travail.",
    "Tout le monde se distrait parfois. L'important c'est de revenir.",
    "Allez, tu y es presque ! Reviens au focus.",
  ],
  lowScore: [
    "Ne te décourage pas ! Chaque jour est une nouvelle chance.",
    "Tu fais mieux que tu ne le penses. Continue !",
    "L'important c'est de progresser, pas d'être parfait.",
  ],
  midScore: [
    "Bon travail ! Tu peux encore t'améliorer.",
    "Tu es sur la bonne voie. Pousse un peu plus !",
    "Bien joué ! La régularité prime sur la perfection.",
  ],
  highScore: [
    "Wow ! Tu es une machine de productivité !",
    "Score incroyable ! Tu t'améliores chaque jour.",
    "Tu es en train de construire quelque chose de grand !",
    "Extraordinaire ! Continue sur cette lancée.",
  ],
  pause: [
    "Bonne pause ! Recharge-toi pour la prochaine session.",
    "Le repos fait partie de la performance. Reviens frais !",
    "Prends ton temps. Tu repars plus fort après.",
  ],
  goal_reached: [
    "OBJECTIF ATTEINT ! Tu es incroyable !",
    "Tu as tout donné aujourd'hui. Bravo champion !",
    "Mission accomplie ! Tu peux être fier de toi.",
  ],
  idle: [
    "Prêt à commencer ? Lance une session quand tu veux !",
    "Chaque session te rapproche de tes objectifs.",
    "La productivité commence par un clic. Tu es prêt ?",
  ],
}

export function getCoachMessage(mode, type, score = null) {
  const pool = mode === 'brutal' ? BRUTAL : ENCOURAGE

  if (type === 'check' && score !== null) {
    if (score < 40) return getRandom(pool.lowScore)
    if (score < 70) return getRandom(pool.midScore)
    return getRandom(pool.highScore)
  }

  return getRandom(pool[type] || pool.productive)
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const SYSTEM_PROMPT = (settings, context) => `Tu es un assistant IA intelligent et polyvalent. Tu parles TOUJOURS en français.
Tu peux discuter de n'importe quel sujet : actualité, sciences, culture, sport, histoire, technologie, cuisine, voyage, etc.
Tu es aussi expert en productivité et développement personnel.
Tes réponses sont courtes (2-3 phrases max) car l'utilisateur t'écoute à voix haute.
${context.score > 0 ? `Contexte utilisateur : score de discipline ${context.score}%, ${context.productiveTime} minutes productives aujourd'hui.` : ''}`

export async function getGroqMessage(groqKey, history, settings, context) {
  if (!groqKey) return null
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(settings, context) },
        ...history.slice(-10),
      ],
      max_tokens: 150,
      temperature: 0.8,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content?.trim() || null
}

export async function getOpenAIMessage(apiKey, history, settings, context) {
  if (!apiKey) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT(settings, context) },
          ...history.slice(-10),
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}
