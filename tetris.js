const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
//grow x and y by 20
context.scale(15, 15)

context.fillStyle = '#000';
context.fillRect(0, 0, canvas.width, canvas.height)

const matrix = [
    [0, 0 ,0],
    [1, 1, 1],
    [0, 1, 0],
];


function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0 ,0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ]
    } else if (type === 'L') {
        return [
            [0, 3 ,0],
            [0, 3, 0],
            [3, 3, 0],
        ]
    } else if (type === 'S') {
        return [
            [0, 4 ,4],
            [4, 4, 0],
            [0, 0, 0],
        ]
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ]
    }
}

function draw() {
    //need to redraw the canvas so that old sprite paths are removed
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height)

    drawMatrix(arena, {x: 0, y: 0})
    drawMatrix(player.matrix, player.pos)
}
const colors = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#3877FF',
]

// will draw tiles using the matrix + x and y positions
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1)
            }
        })
    })
}
//copy all the value of player into arena at the correct position
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if(value !== 0) {
                //if value is 1(aka tile) then the arena matrix position with be turned to 1
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        })
    })
}
//sweeps arena starting at bottom(max y), checks first X spot of bottom row, if at any point theres a 0, go to next row. It will only work if full row was 1s
//which would mean that the continue outer was not called, and it went to fill(0) and unshift and change score.
function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length -1; y > 0; --y) {
        for (let x  = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0)
        arena.unshift(row)
        ++y;
    
        player.score += rowCount * 10;
        rowCount *= 2;
    }
}
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for(let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !==  0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}
//when a piece is dropped either by 1000ms, or by player pressing down key
function playerDrop() {
    player.pos.y++;
    // collision detects either hits ground, or touches another piece
    if (collide(arena, player)){
        //if it collided, then were already on top of another piece or ground, need to put player back up 1
        player.pos.y--;
        //calling merge function which merges the current player pos into the arena matrix grid(viewed with console.table(arena))
        merge(arena,player)
        playerReset() //GET NEW PIECE RANDOM FUNCTION
        arenaSweep()
        updateScore();
        //reset player back to top
        // player.pos.y = 0;
    }
    //if we press down, we don't want it to double drop sometimes so reset to 0 to give a 1 sec buffer
    dropCounter = 0;
}
//for x position movement, if collide with side(goes out 1 block or goes on another block from the side), then return 1 movement of other dir
function playerMove(dir){
    player.pos.x += dir;
    if(collide(arena, player)) {
        player.pos.x -= dir
    }
}
//only called when player collides with another piece/ground, if collision right away again, it means they stacked on top, and time to wipe whole board
function playerReset() {
    const pieces = 'ILOTS';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0])
    player.pos.y = 0;
    // notation | means FLOORED
    player.pos.x = (arena[0].length / 2 | 0) -
                    (player.matrix[0].length / 2 | 0)
    if(collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
}
//when there is a rotation INTO the wall, it needs to offset back either -1 or +1 based on which side
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir)
    while(collide(arena, player)) {
        //we try +1 to the right aka assuming we went off screen from the left side, HOWEVER
        //if we are wrong, then we went off right side and now we are off by 2!!!! So offset will be equal to flipped 2 (+/-)
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if(offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}
// flipped basically
function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}
let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    //approx every 1000 milliseconds, drop counter hits 1000, which triggers if statement for y+=1 drop
    dropCounter += deltaTime;
    
    if(dropCounter > dropInterval) {
        playerDrop();
    }
    draw();
    //more research into requestAnimationFrame needed - better alternative to setInterval for game dev
    //requestAnimationFrame calls update from within update for infinite loop
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

//create the arena to log gamespace - check console.table to view
const arena = createMatrix(16,26)
// console.log(arena), console.table(arena)
//easiest to keep track of player this way
const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
}
//keyboard controls
document.addEventListener('keydown', event => {
    if(event.code === "ArrowLeft"){
        playerMove(-1)
    }
    else if(event.code === "ArrowRight"){
        playerMove(+1)
    }
    else if(event.code === "ArrowDown"){
        playerDrop();
    }
    else if(event.keyCode === 81){
        playerRotate(-1);
    }
    else if(event.keyCode === 87){
        playerRotate(+1);
    }
})

playerReset();
updateScore();
update();