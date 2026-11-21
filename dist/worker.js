const region = new URL(self.location.href).searchParams.get('region');
importScripts(region === 'JP' ? 'data-jp.js?v=11' : 'data.js?v=7', 'solver.js?v=16');
onmessage=({data})=>{try{postMessage({result:BondSolver.solve(FGO_DATA,data,n=>postMessage({progress:n}))})}catch(e){postMessage({error:e.message})}};
