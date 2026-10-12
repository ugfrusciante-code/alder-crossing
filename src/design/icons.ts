const paths:Record<string,string>={
 build:'M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7',
 economy:'M12 3v18M8 6H6L3 13h6L6 6m10 0h2l-3 7h6l-3-7M6 6h12M8 21h8',
 people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 7m2 3q3 1 3 7',
 army:'M12 2 3 6v7c0 5 9 9 9 9s9-4 9-9V6L12 2ZM12 6v11M8 10h8',
 charter:'M5 2h14v20l-7-4-7 4V2ZM9 7h6M9 11h6',
 wood:'m4 8 10-5 6 5-10 5-6-5ZM4 8v9l6 4 10-5V8M10 13v8',
 food:'M12 22V3m0 6C5 9 5 3 5 3s7 0 7 6Zm0 7c-7 0-7-6-7-6s7 0 7 6Zm0-4c7 0 7-6 7-6s-7 0-7 6Zm0 7c7 0 7-6 7-6s-7 0-7 6Z',
 coin:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM15 7H9v5h6v5H9m3-12v14',
 flame:'M13 2c2 6-4 6-1 10 0-4 4-4 5-7 7 10 3 17-5 17S0 13 7 7c-1 5 1 6 2 6C7 7 13 7 13 2Z',
 close:'m6 6 12 12M6 18 18 6',home:'M3 11 12 3l9 8M6 10v11h12V10',plus:'M12 5v14M5 12h14',minus:'M5 12h14',arrow:'M4 12h16m-6-6 6 6-6 6',back:'M20 12H4m6-6-6 6 6 6',pause:'M8 5v14M16 5v14',play:'m8 4 12 8-12 8V4Z',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',rotate:'M4 8a9 9 0 1 1-1 8M4 2v6h6',check:'m4 12 5 5L20 6',book:'M12 5Q5 1 2 4v16q5-3 10 0 5-3 10 0V4q-5-3-10 1Zm0 0v15'};
export const icon=(name:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(paths[name]??paths.build).split('!').map(d=>`<path d="${d}"/>`).join('')}</svg>`;
export function drawing(kind:string){const mill=kind==='mill',field=kind==='field';return `<svg class="drawing" viewBox="0 0 160 110" fill="none" aria-hidden="true"><ellipse cx="81" cy="94" rx="63" ry="7" fill="currentColor" opacity=".08"/><g stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">${field?'<path d="m17 75 71-34 57 35-72 25-56-26Z M28 80l72-34M40 85l72-34M52 90l72-34M65 95l71-33"/><path d="M29 68V53m-5 2 5 5 5-5M53 57V42m-5 2 5 5 5-5M78 47V32m-5 2 5 5 5-5M105 61V46m-5 2 5 5 5-5"/>':`<path fill="var(--paper)" d="M39 57v32l46 10 40-22V47L81 31 39 57Z"/><path d="m28 59 46-40 62 28-51 26-57-14Z" fill="var(--sketch)"/><path d="m28 59 56 14 52-26M74 19l10 54v26M45 65v24M118 55v25M40 74l43 9 42-22M94 93V76l12-6v16M53 71v12l14 3V75Z"/><path d="m42 48 54 19M48 43l56 20M54 38l58 21M61 33l59 22M68 27l60 24" opacity=".4"/>${mill?'<path d="M82 25v59M52 55h60" stroke-width="5"/><path d="m82 25 9 2v20h-9M112 55v9H91v-9M82 84l-9-2V62h9M52 55v-9h21v9" fill="var(--paper)"/>':'<path d="M104 31V15l10 4v17M101 15l13 4 4-3-12-4Z"/>'}`}</g></svg>`}
