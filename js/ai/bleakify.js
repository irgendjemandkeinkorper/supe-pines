/* Optional prose helper. Static Pages cannot safely ship a Gemini secret, so
   deployments may provide a same-origin proxy at
   window.SUPE_PINES_BLEAKIFY_ENDPOINT. For a personal session, the button
   can accept a one-shot key without storing or logging it. */
export async function bleakifyText(text, context='scene'){
  const source = String(text||'').trim();
  if(!source) throw new Error('Write a first draft before using Bleakify.');
  const proxy = window.SUPE_PINES_BLEAKIFY_ENDPOINT;
  let url = proxy;
  const headers = {'Content-Type':'application/json'};
  if(!url){
    const key = window.SUPE_PINES_GEMINI_API_KEY || window.prompt('Gemini API key (used once, never saved):');
    if(!key) throw new Error('Bleakify needs a configured proxy or a Gemini API key.');
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
  }
  const prompt = `Rewrite the following ${context} for Supe Pines: comic-book noir, vivid but concise, emotionally grounded, and suitable for a shared tabletop game. Preserve every concrete fact and do not add plot outcomes. Return only the rewritten text.\n\n${source}`;
  const response = await fetch(url, {method:'POST', headers, body:JSON.stringify(proxy ? {text:source, context, prompt} : {contents:[{parts:[{text:prompt}]}]})});
  if(!response.ok) throw new Error(`Bleakify request failed (${response.status}).`);
  const data = await response.json();
  const result = proxy ? data.text : data.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('');
  if(!result?.trim()) throw new Error('Bleakify returned no text.');
  return result.trim();
}

export async function bleakifyField(fieldId, context, button){
  const field = document.getElementById(fieldId);
  if(!field) return;
  const old = button?.textContent;
  if(button){ button.disabled=true; button.textContent='Bleakifying…'; }
  try{
    field.value = await bleakifyText(field.value, context);
    field.dispatchEvent(new Event('input', {bubbles:true}));
  }catch(error){ window.alert(error.message || 'Bleakify could not rewrite that text.'); }
  finally{ if(button){ button.disabled=false; button.textContent=old || 'Bleakify'; } }
}
