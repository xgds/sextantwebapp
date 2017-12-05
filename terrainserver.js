/**
 * Created by johan on 2/9/2017.
 */
const path = require('path');
const url = require('url');


function serveTerrain(app, terrainPath) {
	console.log('serving terrain');
    const terrainPathRouter = terrainPath.charAt(0) !== '/' ? '/' + terrainPath : terrainPath;
    console.log(terrainPathRouter);

    app.get(terrainPathRouter + '/layer.json', function (req, res) {
    	    console.log('sending json layer');
        res.sendFile(path.resolve(__dirname, 'public', 'layer.json'));
    });

    app.get(terrainPathRouter + '/:z/:x/:y.terrain', function (req, res) {
        console.log('GETTING TERRAIN TILE');
        const x = req.params.x;
        const y = req.params.y;
        const z = req.params.z;
        //y = 2**z-y-1;
        console.log(x,y,z);

        if (z == 0 &&
            x == 1 &&
            y == 0) {
            let blankPath = path.resolve(__dirname, 'public', 'smallterrain-blank.terrain');
            console.log(blankPath);
            res.set('Content-Encoding', 'gzip');
            res.sendFile(blankPath);
        } else {
            const localTerrain = path.resolve(__dirname, terrainPath, z, x, y + '.terrain');
            console.log('resolving path ' + localTerrain);
            res.setHeader('Content-Encoding', 'gzip');
            res.sendFile(localTerrain);
        }
    });
    
    return app;
}
module.exports = serveTerrain;