const path = require('path');

function invertedImageTiles(app) {
    // For rendering files to jupyter notebook
    app.get('/CustomMaps/:tileset/:z/:x/:y.png', function (req, res) {
        const x = req.params.x;
        let y = req.params.y;
        const z = req.params.z;
        y = 2**z-y-1;

        const tileset = req.params.tileset;
        console.log(path.resolve(__dirname, 'public', 'CustomMaps', tileset, z, x, y + '.png'));
        //res.set('Content-Encoding', 'gzip');
        res.sendFile(path.resolve(__dirname, 'public', 'CustomMaps', tileset, z, x, y + '.png'));
    });
}

export {invertedImageTiles}