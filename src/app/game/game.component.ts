import { Component, ViewChild, ViewEncapsulation, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

import { Subscription, timer, Subject} from 'rxjs'; // , timer, Subject
import { takeUntil, filter, map } from 'rxjs/operators';

// https://rembound.com/articles/bubble-shooter-game-tutorial-with-html5-and-javascript#demo
// https://github.com/rembound/Bubble-Shooter-HTML5
@Component({
  selector: 'app-game',
  templateUrl: 'game.page.html',
  styleUrls: ['game.page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('gameCanvas', {static: true}) gameCanvas: ElementRef<HTMLCanvasElement> = {} as ElementRef;

    private canvas: any;
    private context: any;

    // Timing and frames per second
    private lastframe = 0;
    private fpstime = 0;
    private framecount = 0;
    private fps = 0;

    private initialized = false;

    // Level
    private level:any = {
        x: 4,           // X position
        y: 83,          // Y position
        width: 0,       // Width, gets calculated
        height: 0,      // Height, gets calculated
        columns: 15,    // Number of tile columns
        rows: 14,       // Number of tile rows
        tilewidth: 40,  // Visual width of a tile
        tileheight: 40, // Visual height of a tile
        rowheight: 34,  // Height of a row
        radius: 20,     // Bubble collision radius
        tiles: []       // The two-dimensional tile array
    };



    // Player
    private player: any = {
        x: 0,
        y: 0,
        angle: 0,
        tiletype: 0,
        bubble: {
                    x: 0,
                    y: 0,
                    angle: 0,
                    speed: 1000,
                    dropspeed: 900,
                    tiletype: 0,
                    visible: false
                },
        nextbubble: {
                        x: 0,
                        y: 0,
                        tiletype: 0
                    }
    };

    // Neighbor offset table
    private neighborsoffsets = [[[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row tiles
                            [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]];  // Odd row tiles

    // Number of different colors
    private bubblecolors = 7;

    // Game states
    private gamestates = { init: 0, ready: 1, shootbubble: 2, removecluster: 3, gameover: 4 };
    private gamestate: any;

    // Score
    private score = 0;

    private turncounter = 0;
    private rowoffset = 0;

    // Animation variables
    private animationstate = 0;
    private animationtime = 0;

    // Clusters
    private showcluster = false;
    private cluster:any = [];
    private floatingclusters:any = [];

    // Images
    private images: any = [];
    private bubbleimage: any;

    // Image loading global variables
    private loadcount = 0;
    private loadtotal = 0;
    private preloaded = false;


    constructor(
        // private route: ActivatedRoute,
        // private eventSvc: EventService,
        // private configSvc: ConfigService,
        // // private dialogs: Dialog,
        // private spinner: NgxSpinnerService,
        // private admobService: AdMobService,
        // public dialog: MatDialog,
    ) {
        this.gamestate = this.gamestates.init;
    }

    ngOnInit() {
    }

    ngAfterViewInit() {
        this.init();
    }

    ngOnDestroy() {

    }



    // Load images
    private loadImages(imagefiles:string[]) {
        // Initialize variables
        this.loadcount = 0;
        this.loadtotal = imagefiles.length;
        this.preloaded = false;

        // Load the images
        const loadedimages = [];
        for (let i=0; i<imagefiles.length; i++) {
            // Create the image object
            const image = new Image();

            // Add onload event handler
            image.onload = () => {
                this.loadcount++;
                if (this.loadcount == this.loadtotal) {
                    // Done loading
                    this.preloaded = true;
                }
            };

            // Set the source url of the image
            image.src = imagefiles[i];

            // Save to the image array
            loadedimages[i] = image;
        }

        // Return an array of images
        return loadedimages;
    }

    init() {
        this.canvas = this.gameCanvas.nativeElement;
        this.context = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 800;

        // Load images
        this.images = this.loadImages(['assets/images/bubble-sprites.png']);
        this.bubbleimage = this.images[0];

        // Add mouse events
        // this.canvas.addEventListener('mousemove', onMouseMove);
        // this.canvas.addEventListener('mousedown', onMouseDown);

        // Initialize the two-dimensional tile array
        for (let i=0; i<this.level.columns; i++) {
            this.level.tiles[i] = [];
            for (let j=0; j<this.level.rows; j++) {
                // Define a tile type and a shift parameter for animation
                this.level.tiles[i][j] = new Tile(i, j, 0, 0);
            }
        }

        this.level.width = this.level.columns * this.level.tilewidth + this.level.tilewidth/2;
        this.level.height = (this.level.rows-1) * this.level.rowheight + this.level.tileheight;

        // Init the player
        this.player.x = this.level.x + this.level.width/2 - this.level.tilewidth/2;
        this.player.y = this.level.y + this.level.height;
        this.player.angle = 90;
        this.player.tiletype = 0;

        this.player.nextbubble.x = this.player.x - 2 * this.level.tilewidth;
        this.player.nextbubble.y = this.player.y;

        // New game
        this.newGame();

        // Enter main loop
        this.main(0);

    }

    // Main loop
    private main(tframe: number) {

        // Request animation frames
        // window.requestAnimationFrame(main);
        // window.requestAnimationFrame(() => this.main(0));
        window.requestAnimationFrame(this.main.bind(this));

        if (!this.initialized) {
            // Preloader

            // Clear the canvas
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw the frame
            this.drawFrame();

            // Draw a progress bar
            let loadpercentage = this.loadcount/this.loadtotal;
            this.context.strokeStyle = '#ff8080';
            this.context.lineWidth=3;
            this.context.strokeRect(18.5, 0.5 + this.canvas.height - 51, this.canvas.width-37, 32);
            this.context.fillStyle = '#ff8080';
            this.context.fillRect(18.5, 0.5 + this.canvas.height - 51, loadpercentage*(this.canvas.width-37), 32);

            // Draw the progress text
            let loadtext = 'Loaded ' + this.loadcount + '/' + this.loadtotal + ' images';
            this.context.fillStyle = '#000000';
            this.context.font = '16px Verdana';
            this.context.fillText(loadtext, 18, 0.5 + this.canvas.height - 63);

            if (this.preloaded) {
                // Add a delay for demonstration purposes
                setTimeout(() =>{
                    this.initialized = true;}, 1000);
            }
        } else {
            // Update and render the game

            this.update(tframe);
            this.render();
        }
    }

    // Update the game state
    private update(tframe: number) {
        console.log('update', tframe, this.lastframe);
        const dt = (tframe - this.lastframe) / 1000;
        this.lastframe = tframe;

        // Update the fps counter
        this.updateFps(dt);

        if (this.gamestate == this.gamestates.ready) {
            // Game is ready for player input
        } else if (this.gamestate == this.gamestates.shootbubble) {
            // Bubble is moving
            this.stateShootBubble(dt);
        } else if (this.gamestate == this.gamestates.removecluster) {
            // Remove cluster and drop tiles
            this.stateRemoveCluster(dt);
        }
    }

    private setGameState(newgamestate: any) {
        this.gamestate = newgamestate;

        this.animationstate = 0;
        this.animationtime = 0;
    }

    private stateShootBubble(dt: number) {
        console.log('stateShootBubble', dt);
        // Bubble is moving

        // Move the bubble in the direction of the mouse
        this.player.bubble.x += dt * this.player.bubble.speed * Math.cos(this.degToRad(this.player.bubble.angle));
        this.player.bubble.y += dt * this.player.bubble.speed * -1*Math.sin(this.degToRad(this.player.bubble.angle));

        // Handle left and right collisions with the level
        if (this.player.bubble.x <= this.level.x) {
            // Left edge
            this.player.bubble.angle = 180 - this.player.bubble.angle;
            this.player.bubble.x = this.level.x;
        } else if (this.player.bubble.x + this.level.tilewidth >= this.level.x + this.level.width) {
            // Right edge
            this.player.bubble.angle = 180 - this.player.bubble.angle;
            this.player.bubble.x = this.level.x + this.level.width - this.level.tilewidth;
        }

        // Collisions with the top of the level
        if (this.player.bubble.y <= this.level.y) {
            // Top collision
            this.player.bubble.y = this.level.y;
            this.snapBubble();
            return;
        }

        // Collisions with other tiles
        for (let i=0; i< this.level.columns; i++) {
            for (let j=0; j<this.level.rows; j++) {
                let tile = this.level.tiles[i][j];

                // Skip empty tiles
                if (tile.type < 0) {
                    continue;
                }

                // Check for intersections
                let coord = this.getTileCoordinate(i, j);
                if (this.circleIntersection(this.player.bubble.x + this.level.tilewidth/2,
                                       this.player.bubble.y + this.level.tileheight/2,
                                       this.level.radius,
                                       coord.tilex + this.level.tilewidth/2,
                                       coord.tiley + this.level.tileheight/2,
                                       this.level.radius)) {

                    // Intersection with a level bubble
                    this.snapBubble();
                    return;
                }
            }
        }
    }

    private stateRemoveCluster(dt: number) {
        if (this.animationstate == 0) {
            this.resetRemoved();

            // Mark the tiles as removed
            for (let i=0; i< this.cluster.length; i++) {
                // Set the removed flag
                this.cluster[i].removed = true;
            }

            // Add cluster score
            this.score += this.cluster.length * 100;

            // Find floating clusters
            this.floatingclusters = this.findFloatingClusters();

            if (this.floatingclusters.length > 0) {
                // Setup drop animation
                for (let i=0; i<this.floatingclusters.length; i++) {
                    for (let j=0; j<this.floatingclusters[i].length; j++) {
                        let tile = this.floatingclusters[i][j];
                        tile.shift = 0;
                        tile.shift = 1;
                        tile.velocity = this.player.bubble.dropspeed;

                        this.score += 100;
                    }
                }
            }

            this.animationstate = 1;
        }

        if (this.animationstate == 1) {
            // Pop bubbles
            let tilesleft = false;
            for (let i=0; i<this.cluster.length; i++) {
                let tile = this.cluster[i];

                if (tile.type >= 0) {
                    tilesleft = true;

                    // Alpha animation
                    tile.alpha -= dt * 15;
                    if (tile.alpha < 0) {
                        tile.alpha = 0;
                    }

                    if (tile.alpha == 0) {
                        tile.type = -1;
                        tile.alpha = 1;
                    }
                }
            }

            // Drop bubbles
            for (let i=0; i<this.floatingclusters.length; i++) {
                for (let j=0; j<this.floatingclusters[i].length; j++) {
                    let tile = this.floatingclusters[i][j];

                    if (tile.type >= 0) {
                        tilesleft = true;

                        // Accelerate dropped tiles
                        tile.velocity += dt * 700;
                        tile.shift += dt * tile.velocity;

                        // Alpha animation
                        tile.alpha -= dt * 8;
                        if (tile.alpha < 0) {
                            tile.alpha = 0;
                        }

                        // Check if the bubbles are past the bottom of the level
                        if (tile.alpha == 0 || (tile.y * this.level.rowheight + tile.shift > (this.level.rows - 1) * this.level.rowheight + this.level.tileheight)) {
                            tile.type = -1;
                            tile.shift = 0;
                            tile.alpha = 1;
                        }
                    }

                }
            }

            if (!tilesleft) {
                // Next bubble
                this.nextBubble();

                // Check for game over
                let tilefound = false
                for (let i=0; i<this.level.columns; i++) {
                    for (let j=0; j<this.level.rows; j++) {
                        if (this.level.tiles[i][j].type != -1) {
                            tilefound = true;
                            break;
                        }
                    }
                }

                if (tilefound) {
                    this.setGameState(this.gamestates.ready);
                } else {
                    // No tiles left, game over
                    this.setGameState(this.gamestates.gameover);
                }
            }
        }
    }

    // Snap bubble to the grid
    private snapBubble() {
        // Get the grid position
        let centerx = this.player.bubble.x + this.level.tilewidth/2;
        let centery = this.player.bubble.y + this.level.tileheight/2;
        let gridpos = this.getGridPosition(centerx, centery);

        // Make sure the grid position is valid
        if (gridpos.x < 0) {
            gridpos.x = 0;
        }

        if (gridpos.x >= this.level.columns) {
            gridpos.x = this.level.columns - 1;
        }

        if (gridpos.y < 0) {
            gridpos.y = 0;
        }

        if (gridpos.y >= this.level.rows) {
            gridpos.y = this.level.rows - 1;
        }

        // Check if the tile is empty
        let addtile = false;
        if (this.level.tiles[gridpos.x][gridpos.y].type != -1) {
            // Tile is not empty, shift the new tile downwards
            for (let newrow=gridpos.y+1; newrow<this.level.rows; newrow++) {
                if (this.level.tiles[gridpos.x][newrow].type == -1) {
                    gridpos.y = newrow;
                    addtile = true;
                    break;
                }
            }
        } else {
            addtile = true;
        }

        // Add the tile to the grid
        if (addtile) {
            // Hide the player bubble
            this.player.bubble.visible = false;

            // Set the tile
            this.level.tiles[gridpos.x][gridpos.y].type = this.player.bubble.tiletype;

            // Check for game over
            if (this.checkGameOver()) {
                return;
            }

            // Find clusters
            this.cluster = this.findCluster(gridpos.x, gridpos.y, true, true, false);

            if (this.cluster.length >= 3) {
                // Remove the cluster
                this.setGameState(this.gamestates.removecluster);
                return;
            }
        }

        // No clusters found
        this.turncounter++;
        if (this.turncounter >= 5) {
            // Add a row of bubbles
            this.addBubbles();
            this.turncounter = 0;
            this.rowoffset = (this.rowoffset + 1) % 2;

            if (this.checkGameOver()) {
                return;
            }
        }

        // Next bubble
        this.nextBubble();
        this.setGameState(this.gamestates.ready);
    }

    private checkGameOver() {
        // Check for game over
        for (let i=0; i<this.level.columns; i++) {
            // Check if there are bubbles in the bottom row
            if (this.level.tiles[i][this.level.rows-1].type != -1) {
                // Game over
                this.nextBubble();
                this.setGameState(this.gamestates.gameover);
                return true;
            }
        }

        return false;
    }

    private addBubbles() {
        // Move the rows downwards
        for (let i=0; i<this.level.columns; i++) {
            for (let j=0; j<this.level.rows-1; j++) {
                this.level.tiles[i][this.level.rows-1-j].type = this.level.tiles[i][this.level.rows-1-j-1].type;
            }
        }

        // Add a new row of bubbles at the top
        for (let i=0; i<this.level.columns; i++) {
            // Add random, existing, colors
            this.level.tiles[i][0].type = this.getExistingColor();
        }
    }

    // Find the remaining colors
    private findColors() {
        let foundcolors = [];
        let colortable = [];
        for (let i=0; i<this.bubblecolors; i++) {
            colortable.push(false);
        }

        // Check all tiles
        for (let i=0; i<this.level.columns; i++) {
            for (let j=0; j<this.level.rows; j++) {
                let tile = this.level.tiles[i][j];
                if (tile.type >= 0) {
                    if (!colortable[tile.type]) {
                        colortable[tile.type] = true;
                        foundcolors.push(tile.type);
                    }
                }
            }
        }

        return foundcolors;
    }

    // Find cluster at the specified tile location
    private findCluster(tx: number, ty: number, matchtype: boolean, reset: boolean, skipremoved: boolean) {
        // Reset the processed flags
        if (reset) {
            this.resetProcessed();
        }

        // Get the target tile. Tile coord must be valid.
        let targettile = this.level.tiles[tx][ty];

        // Initialize the toprocess array with the specified tile
        let toprocess = [targettile];
        targettile.processed = true;
        let foundcluster = [];

        while (toprocess.length > 0) {
            // Pop the last element from the array
            let currenttile = toprocess.pop();

            // Skip processed and empty tiles
            if (currenttile.type == -1) {
                continue;
            }

            // Skip tiles with the removed flag
            if (skipremoved && currenttile.removed) {
                continue;
            }

            // Check if current tile has the right type, if matchtype is true
            if (!matchtype || (currenttile.type == targettile.type)) {
                // Add current tile to the cluster
                foundcluster.push(currenttile);

                // Get the neighbors of the current tile
                let neighbors = this.getNeighbors(currenttile);

                // Check the type of each neighbor
                for (let i=0; i<neighbors.length; i++) {
                    if (!neighbors[i].processed) {
                        // Add the neighbor to the toprocess array
                        toprocess.push(neighbors[i]);
                        neighbors[i].processed = true;
                    }
                }
            }
        }

        // Return the found cluster
        return foundcluster;
    }

    // Find floating clusters
    private findFloatingClusters() {
        // Reset the processed flags
        this.resetProcessed();

        let foundclusters = [];

        // Check all tiles
        for (let i=0; i<this.level.columns; i++) {
            for (let j=0; j<this.level.rows; j++) {
                let tile = this.level.tiles[i][j];
                if (!tile.processed) {
                    // Find all attached tiles
                    let foundcluster = this.findCluster(i, j, false, false, true);

                    // There must be a tile in the cluster
                    if (foundcluster.length <= 0) {
                        continue;
                    }

                    // Check if the cluster is floating
                    let floating = true;
                    for (let k=0; k<foundcluster.length; k++) {
                        if (foundcluster[k].y == 0) {
                            // Tile is attached to the roof
                            floating = false;
                            break;
                        }
                    }

                    if (floating) {
                        // Found a floating cluster
                        foundclusters.push(foundcluster);
                    }
                }
            }
        }

        return foundclusters;
    }

    // Reset the processed flags
    private resetProcessed() {
        for (let i=0; i<this.level.columns; i++) {
            for (let j=0; j<this.level.rows; j++) {
                this.level.tiles[i][j].processed = false;
            }
        }
    }

    // Reset the removed flags
    private resetRemoved() {
        for (let i=0; i<this.level.columns; i++) {
            for (let j=0; j<this.level.rows; j++) {
                this.level.tiles[i][j].removed = false;
            }
        }
    }

    // Get the neighbors of the specified tile
    private getNeighbors(tile: any) {
        let tilerow = (tile.y + this.rowoffset) % 2; // Even or odd row
        let neighbors = [];

        // Get the neighbor offsets for the specified tile
        let n = this.neighborsoffsets[tilerow];

        // Get the neighbors
        for (let i=0; i<n.length; i++) {
            // Neighbor coordinate
            let nx = tile.x + n[i][0];
            let ny = tile.y + n[i][1];

            // Make sure the tile is valid
            if (nx >= 0 && nx < this.level.columns && ny >= 0 && ny < this.level.rows) {
                neighbors.push(this.level.tiles[nx][ny]);
            }
        }

        return neighbors;
    }

    private updateFps(dt: number) {
        if (this.fpstime > 0.25) {
            // Calculate fps
            this.fps = Math.round(this.framecount / this.fpstime);

            // Reset time and framecount
            this.fpstime = 0;
            this.framecount = 0;
        }

        // Increase time and framecount
        this.fpstime += dt;
        this.framecount++;
    }

    // Draw text that is centered
    private drawCenterText(text: string, x: number, y: number, width: number) {
        let textdim = this.context.measureText(text);
        this.context.fillText(text, x + (width-textdim.width)/2, y);
    }

    // Render the game
    private render() {
        // Draw the frame around the game
        this.drawFrame();

        let yoffset =  this.level.tileheight/2;

        // Draw level background
        this.context.fillStyle = '#8c8c8c';
        this.context.fillRect(this.level.x - 4, this.level.y - 4, this.level.width + 8, this.level.height + 4 - yoffset);

        // Render tiles
        this.renderTiles();

        // Draw level bottom
        this.context.fillStyle = '#656565';
        this.context.fillRect(this.level.x - 4, this.level.y - 4 + this.level.height + 4 - yoffset, this.level.width + 8, 2*this.level.tileheight + 3);

        // Draw score
        this.context.fillStyle = '#ffffff';
        this.context.font = '18px Verdana';
        let scorex = this.level.x + this.level.width - 150;
        let scorey = this.level.y+this.level.height + this.level.tileheight - yoffset - 8;
        this.drawCenterText('Score:', scorex, scorey, 150);
        this.context.font = '24px Verdana';
        this.drawCenterText(this.score.toString(), scorex, scorey+30, 150);

        // Render cluster
        if (this.showcluster) {
            this.renderCluster(this.cluster, 255, 128, 128);

            for (let i=0; i<this.floatingclusters.length; i++) {
                let col = Math.floor(100 + 100 * i / this.floatingclusters.length);
                this.renderCluster(this.floatingclusters[i], col, col, col);
            }
        }


        // Render player bubble
        this.renderPlayer();

        // Game Over overlay
        if (this.gamestate == this.gamestates.gameover) {
            this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.context.fillRect(this.level.x - 4, this.level.y - 4, this.level.width + 8, this.level.height + 2 * this.level.tileheight + 8 - yoffset);

            this.context.fillStyle = '#ffffff';
            this.context.font = '24px Verdana';
            this.drawCenterText('Game Over!', this.level.x, this.level.y + this.level.height / 2 + 10, this.level.width);
            this.drawCenterText('Click to start', this.level.x, this.level.y + this.level.height / 2 + 40, this.level.width);
        }
    }

    // Draw a frame around the game
    private drawFrame() {
        // Draw background
        this.context.fillStyle = '#e8eaec';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw header
        this.context.fillStyle = '#303030';
        this.context.fillRect(0, 0, this.canvas.width, 79);

        // Draw title
        this.context.fillStyle = '#ffffff';
        this.context.font = '24px Verdana';
        this.context.fillText('Bubble Shooter Example - Rembound.com', 10, 37);

        // Display fps
        this.context.fillStyle = '#ffffff';
        this.context.font = '12px Verdana';
        this.context.fillText('Fps: ' + this.fps, 13, 57);
    }

    // Render tiles
    private renderTiles() {
        // Top to bottom
        for (let j=0; j<this.level.rows; j++) {
            for (let i=0; i<this.level.columns; i++) {
                // Get the tile
                let tile = this.level.tiles[i][j];

                // Get the shift of the tile for animation
                let shift = tile.shift;

                // Calculate the tile coordinates
                let coord = this.getTileCoordinate(i, j);

                // Check if there is a tile present
                if (tile.type >= 0) {
                    // Support transparency
                    this.context.save();
                    this.context.globalAlpha = tile.alpha;

                    // Draw the tile using the color
                    this.drawBubble(coord.tilex, coord.tiley + shift, tile.type);

                    this.context.restore();
                }
            }
        }
    }

    // Render cluster
    private renderCluster(cluster: any, r: number, g: number, b: number) {
        for (let i=0; i<cluster.length; i++) {
            // Calculate the tile coordinates
            let coord = this.getTileCoordinate(cluster[i].x, cluster[i].y);

            // Draw the tile using the color
            this.context.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
            this.context.fillRect(coord.tilex+this.level.tilewidth/4, coord.tiley+this.level.tileheight/4, this.level.tilewidth/2, this.level.tileheight/2);
        }
    }

    // Render the player bubble
    private renderPlayer() {
        let centerx = this.player.x + this.level.tilewidth/2;
        let centery = this.player.y + this.level.tileheight/2;

        // Draw player background circle
        this.context.fillStyle = '#7a7a7a';
        this.context.beginPath();
        this.context.arc(centerx, centery, this.level.radius+12, 0, 2*Math.PI, false);
        this.context.fill();
        this.context.lineWidth = 2;
        this.context.strokeStyle = '#8c8c8c';
        this.context.stroke();

        // Draw the angle
        this.context.lineWidth = 2;
        this.context.strokeStyle = '#0000ff';
        this.context.beginPath();
        this.context.moveTo(centerx, centery);
        this.context.lineTo(centerx + 1.5*this.level.tilewidth * Math.cos(this.degToRad(this.player.angle)), centery - 1.5*this.level.tileheight * Math.sin(this.degToRad(this.player.angle)));
        this.context.stroke();

        // Draw the next bubble
        this.drawBubble(this.player.nextbubble.x, this.player.nextbubble.y, this.player.nextbubble.tiletype);

        // Draw the bubble
        if (this.player.bubble.visible) {
            this.drawBubble(this.player.bubble.x, this.player.bubble.y, this.player.bubble.tiletype);
        }

    }

    // Get the tile coordinate
    private getTileCoordinate(column: number, row: number) {
        let tilex = this.level.x + column * this.level.tilewidth;

        // X offset for odd or even rows
        if ((row + this.rowoffset) % 2) {
            tilex += this.level.tilewidth/2;
        }

        let tiley = this.level.y + row * this.level.rowheight;
        return { tilex: tilex, tiley: tiley };
    }

    // Get the closest grid position
    private getGridPosition(x: number, y: number) {
        let gridy = Math.floor((y - this.level.y) / this.level.rowheight);

        // Check for offset
        let xoffset = 0;
        if ((gridy + this.rowoffset) % 2) {
            xoffset = this.level.tilewidth / 2;
        }
        let gridx = Math.floor(((x - xoffset) - this.level.x) / this.level.tilewidth);

        return { x: gridx, y: gridy };
    }


    // Draw the bubble
    private drawBubble(x: number, y: number, index: number) {
        if (index < 0 || index >= this.bubblecolors)
            return;

        // Draw the bubble sprite
        this.context.drawImage(this.bubbleimage, index * 40, 0, 40, 40, x, y, this.level.tilewidth, this.level.tileheight);
    }

    // Start a new game
    private newGame() {
        // Reset score
        this.score = 0;

        this.turncounter = 0;
        this.rowoffset = 0;

        // Set the gamestate to ready
        this.setGameState(this.gamestates.ready);

        // Create the level
        this.createLevel();

        // Init the next bubble and set the current bubble
        this.nextBubble();
        this.nextBubble();
    }

    // Create a random level
    private createLevel() {
        // Create a level with random tiles
        for (let j=0; j<this.level.rows; j++) {
            let randomtile = this.randRange(0, this.bubblecolors-1);
            let count = 0;
            for (let i=0; i<this.level.columns; i++) {
                if (count >= 2) {
                    // Change the random tile
                    let newtile = this.randRange(0, this.bubblecolors-1);

                    // Make sure the new tile is different from the previous tile
                    if (newtile == randomtile) {
                        newtile = (newtile + 1) % this.bubblecolors;
                    }
                    randomtile = newtile;
                    count = 0;
                }
                count++;

                if (j < this.level.rows/2) {
                    this.level.tiles[i][j].type = randomtile;
                } else {
                    this.level.tiles[i][j].type = -1;
                }
            }
        }
    }

    // Create a random bubble for the player
    private nextBubble() {
        // Set the current bubble
        this.player.tiletype = this.player.nextbubble.tiletype;
        this.player.bubble.tiletype = this.player.nextbubble.tiletype;
        this.player.bubble.x = this.player.x;
        this.player.bubble.y = this.player.y;
        this.player.bubble.visible = true;

        // Get a random type from the existing colors
        let nextcolor = this.getExistingColor();

        // Set the next bubble
        this.player.nextbubble.tiletype = nextcolor;
    }

    // Get a random existing color
    private getExistingColor() {
        const existingcolors = this.findColors();

        let bubbletype = 0;
        if (existingcolors.length > 0) {
            bubbletype = existingcolors[this.randRange(0, existingcolors.length-1)];
        }

        return bubbletype;
    }

    // Get a random int between low and high, inclusive
    private randRange(low: number, high: number) {
        return Math.floor(low + Math.random()*(high-low+1));
    }

    // Shoot the bubble
    private shootBubble() {
        // Shoot the bubble in the direction of the mouse
        this.player.bubble.x = this.player.x;
        this.player.bubble.y = this.player.y;
        this.player.bubble.angle = this.player.angle;
        this.player.bubble.tiletype = this.player.tiletype;

        // Set the gamestate
        this.setGameState(this.gamestates.shootbubble);
    }

    // Check if two circles intersect
    private circleIntersection(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
        // Calculate the distance between the centers
        let dx = x1 - x2;
        let dy = y1 - y2;
        let len = Math.sqrt(dx * dx + dy * dy);

        if (len < r1 + r2) {
            // Circles intersect
            return true;
        }

        return false;
    }

    // Convert radians to degrees
    private radToDeg(angle: number) {
        return angle * (180 / Math.PI);
    }

    // Convert degrees to radians
    private degToRad(angle: number) {
        return angle * (Math.PI / 180);
    }

    // On mouse movement
    public onMouseMove(e: any) {
        // Get the mouse position
        let pos = this.getMousePos(this.canvas, e);

        // Get the mouse angle
        let mouseangle = this.radToDeg(Math.atan2((this.player.y+this.level.tileheight/2) - pos.y, pos.x - (this.player.x+this.level.tilewidth/2)));

        // Convert range to 0, 360 degrees
        if (mouseangle < 0) {
            mouseangle = 180 + (180 + mouseangle);
        }

        // Restrict angle to 8, 172 degrees
        let lbound = 8;
        let ubound = 172;
        if (mouseangle > 90 && mouseangle < 270) {
            // Left
            if (mouseangle > ubound) {
                mouseangle = ubound;
            }
        } else {
            // Right
            if (mouseangle < lbound || mouseangle >= 270) {
                mouseangle = lbound;
            }
        }

        // Set the player angle
        this.player.angle = mouseangle;
    }

    // On mouse button click
    public onMouseDown(e: any) {
        // Get the mouse position
        console.log('onMouseDown..', e);
        let pos = this.getMousePos(this.canvas, e);
        console.log(pos);
        if (this.gamestate == this.gamestates.ready) {
            console.log('this.shootBubbl')
            this.shootBubble();
        } else if (this.gamestate == this.gamestates.gameover) {
            this.newGame();
        }
    }

    // Get the mouse position
    private getMousePos(canvas: any, e: any) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width),
            y: Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height)
        };
    }

}

// Define a tile class
class Tile {
    private x: number;
    private y: number;
    private type: number;
    private removed = false;
    private shift: number;
    private velocity = 0;
    private alpha = 1;
    private processed = false;

    constructor(x: number, y: number, type: number, shift: number) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.shift = shift;
    }

};
