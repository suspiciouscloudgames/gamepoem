// Stable, appended phrase IDs keep existing poems compatible across all languages.
// Aliases select the supplied text; base forms are used only when composing a poem.
export const extraPhrases=[
 {ko:'빛',en:'light',tr:'ışık',trStem:'ışığ',tags:['phenomenon']},
 {ko:'흔적',en:'traces',tr:'izler',plural:true,tags:['concept']},
 {ko:'비',en:'rain',tr:'yağmur',tags:['phenomenon']},
 {ko:'도시',en:'the city',tr:'şehir',trStem:'şehr',enAliases:['city'],tags:['place']},
 {ko:'얼굴',en:'a face',tr:'yüz',enAliases:['face'],tags:['body']},
 {ko:'꼬리',en:'a tail',tr:'kuyruk',trStem:'kuyruğ',enAliases:['tail'],trAliases:['kuyruğunu'],tags:['body']},
 {ko:'몸',en:'the body',tr:'beden',enAliases:['body','bodies'],trAliases:['gövdelerini'],tags:['body','place']},
 {ko:'눈',en:'eyes',tr:'gözler',plural:true,trAliases:['gözlerini'],tags:['body']},
 {ko:'파도',en:'waves',tr:'dalgalar',plural:true,tags:['phenomenon']},
 {ko:'해류',en:'currents',tr:'akıntılar',plural:true,tags:['phenomenon']},
 {ko:'경계',en:'borders',tr:'sınırlar',plural:true,trAliases:['sınırları'],tags:['place','concept']},
 {ko:'세계',en:'the world',tr:'dünya',enAliases:['world'],tags:['place']},
 {ko:'장면',en:'a scene',tr:'sahne',enAliases:['scene'],trAliases:['sahnesinde'],tags:['place','concept']},
 {ko:'고독',en:'solitude',tr:'yalnızlık',trStem:'yalnızlığ',tags:['emotion']},
 {ko:'생명체들',en:'living beings',tr:'canlılar',plural:true,tags:['being']},
 {ko:'패턴',en:'patterns',tr:'örüntüler',plural:true,tags:['concept']},
 {ko:'미세한 굴절',en:'minute refractions',tr:'ince kırılmalar',plural:true,trAliases:['ince kırılmalarını'],tags:['phenomenon']},
 {ko:'쏟아지는 비',en:'the pouring rain',tr:'sağanak yağmur',tags:['phenomenon']},
 {ko:'낯선 도시',en:'an unfamiliar city',tr:'yabancı bir şehir',trStem:'yabancı bir şehr',tags:['place']},
 {ko:'익숙한 자리',en:'familiar spots',tr:'tanıdık yerler',plural:true,tags:['place']},
 {ko:'다른 이',en:'someone else',tr:'bir başkası',possessed:true,trAliases:['bir başkasının'],tags:['being']},
 {ko:'해파리',en:'jellyfish',tr:'denizanası',plural:true,possessed:true,trAliases:['denizanasıları','denizanasılarının'],tags:['being']}
]
export const extraPhraseOffset=72
export const extraPhrase=id=>extraPhrases[Number(id.split('-').pop())-extraPhraseOffset]
