/**
 * Created by johan on 2/9/2017.
 */
const path = require('path');
const url = require('url');

function serveTerrain(app, terrainPath) {
	console.log('serving terrain');
    console.log(terrainPath);
    if (terrainPath.charAt(0) !== '/') {
    		terrainPath = '/' + terrainPath;
    }

    app.get(terrainPath + '/layer.json', function (req, res) {
    	//app.get('/tilesets/:tileset/layer.json', function (req, res) {
    	    console.log('sending json layer');
        res.sendFile(path.resolve(__dirname, 'public', 'layer.json'));
    });

    app.get(terrainPath + '/:z/:x/:y.terrain', function (req, res) {
    //app.get('/tilesets/:tileset/:z/:x/:y.terrain', function (req, res) {
    		console.log('GETTING TERRAIN TILE');
    		debugger;
        const x = req.params.x;
        const y = req.params.y;
        const z = req.params.z;
        //y = 2**z-y-1;

        const tileset = req.params.tileset;
        if (z == 0 &&
            x == 1 &&
            y == 0) {
            console.log(path.resolve(__dirname, 'public', 'smallterrain-blank.terrain'));
            res.set('Content-Encoding', 'gzip');
            res.sendFile(path.resolve(__dirname, 'public', 'smallterrain-blank.terrain'));
        } else {
            const localTerrain = path.resolve(terrainPath, z, x, y + '.terrain');
            //const localTerrain = url.resolve(terrainPath, tileset, z, x, y + '.terrain');
            console.log('resolving path ' + localTerrain);
            res.setHeader('Content-Encoding', 'gzip');
            res.sendFile(localTerrain);
            //res.redirect(localTerrain);
        }
    });

    return app;
}
module.exports = serveTerrain;