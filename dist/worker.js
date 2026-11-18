importScripts('data.js?v=7','solver.js?v=7');
onmessage=({data})=>{try{postMessage({result:BondSolver.solve(FGO_DATA,data,n=>postMessage({progress:n}))})}catch(e){postMessage({error:e.message})}};
