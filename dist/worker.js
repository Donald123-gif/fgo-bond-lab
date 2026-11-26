const region = new URL(self.location.href).searchParams.get('region');
importScripts(region === 'JP' ? 'data-jp.js?v=20' : 'data.js?v=20', 'solver.js?v=21');
onmessage=({data})=>{try{postMessage({result:BondSolver.solve(FGO_DATA,data,n=>postMessage({progress:n}))})}catch(e){postMessage({error:e.message})}};
