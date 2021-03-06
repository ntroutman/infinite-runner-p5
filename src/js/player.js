import Level from './level';

export default class Runner {
  constructor(game, level) {
    this.game = game
    //this.sprite.debug = true
    this.GRAVITY = 1800;
    this.JUMP_FORCE = 600
    this.RUN_SPEED = 250;
    this.MAX_RUN_SPEED = 500;
    this.BULLET_SPEED = 800;

    this.auto_run = this.auto_jump= false;

    this.level = level;
  }

  preload() {
    // 8x5
    this.hero_animation = {
      size: {rows: 5, columns: 8},
      animations: {
        idle: {row: 0, cols: [0,1,2,3,4,5,6,7]},
        walk: {row: 1, cols: [0,1,2,3,4,5,3]},
        walk_shoot: {row: 2, cols: [0,1,2,3,4,5]},
        jump_mid: {row: 3, cols: [1]},
        jump_apex: {row: 3, cols: [2]},
        die: {row: 3, cols: [3,4,5,6]},
        crouch: {row: 4, cols: [0,1]}
      }
    }
    this.game.load.spritesheet('hero', 'assets/hero_spritesheet.png', 82, 72, 40);
    this.game.load.image('bullet', 'assets/bullet.png', 16, 16);
  }

  create(entities) {
    // Create a player sprite
    //this.sprite = entities.create(100, this.game.height - (Level.BLOCK_SIZE * 4), 'hero');
    this.sprite = this.game.add.sprite(100, this.game.height - (Level.BLOCK_SIZE * 4), 'hero');
    //entities.add(this.sprite)

    //.add(this.sprite)
    let sprite = this.sprite
    sprite.frame = 0;
    sprite.debug = true;
    sprite.smoothed = false;
    sprite.anchor.set(0.5, 1);

    // Enable physics on the player
    this.game.physics.enable(sprite, Phaser.Physics.ARCADE);
    let body = sprite.body
    body.gravity.y = this.GRAVITY;
    body.allowGravity = true;
    body.setSize(56, 62, 13, 8);

    const columns = this.hero_animation.size.columns;
    for (let anim_name of Object.keys(this.hero_animation.animations)) {
      const anim = this.hero_animation.animations[anim_name];
      sprite.animations.add(anim_name, anim.cols.map(idx => (anim.row * columns) + idx));
    }

    this.bullets = this.game.add.group(entities, 'bullets', false, Phaser.Physics.ARCADE);
  }

  /*
   * These functions control the animation state of the character
   * based upon its physical state
   */
  animate() {
    const body = this.sprite.body;
    if (body.velocity.x < 0) {
      this.sprite.scale.set(-1, 1);
    } else {
      this.sprite.scale.set(1, 1);
    }

    if (body.touching.down) {
      if (body.velocity.x > 0) {
          this.sprite.animations.play('walk_shoot', 10, true);
      } else {
        this.sprite.animations.play('idle', 4, true);
      }
    } else {
      //this.sprite.animations.play('jump', 0, false);

      //if (body.touching.bottom)
      const velocity_apex = 300;
      if (body.velocity.y > -velocity_apex && body.velocity.y < velocity_apex ) {
        //this.sprite.animations.frame = 1;
        this.sprite.animations.play('jump_apex', 0, false);
      } else {
        //this.sprite.animations.frame = 0;
        this.sprite.animations.play('jump_mid', 0, false);
      }
    }
  }

  animate_walk() {
    if (this.is_grounded) {
      this.sprite.animations.play('walk', 10, true);
    }
    if (this.sprite.body.velocity.x < 0) {
      this.sprite.scale.set(-1, 1);
    } else {
      this.sprite.scale.set(1, 1);
    }
  }

  animate_idle() {
    if (this.is_grounded) {
      this.sprite.animations.play('idle', 4, true);
      this.sprite.scale.set(1, 1);
    }
  }

  animate_jump() {
    this.sprite.animations.play('jump', 1, false);
  }

  /*
   * These control the action of the character, and depend on the animation
   * functions to control that.
   */
  left() {
    // If the LEFT key is down, set the player velocity to move left
    this.sprite.body.velocity.x = -this.RUN_SPEED;
    //this.animate_walk();
  }

  stand() {
    // Stop the player from moving horizontally
    this.sprite.body.velocity.x = 0;
  //  this.animate_idle();
  }

  right() {
    this.sprite.body.velocity.x = this.RUN_SPEED;
  //  this.animate_walk();
  }

  run() {
    // add run speed towards the right
    this.right()
  }

  jump() {
    if (this.sprite.body.touching.down) {
      this.sprite.body.velocity.y = -this.JUMP_FORCE;
      //this.animate_jump()
    }
  }

  shoot() {
    // let bullet = this.bullets.getFirstDead(true,
    //     this.sprite.body.position.x + 55, this.sprite.body.position.y + 5,
    //     'bullet');

    let bullet = this.bullets.getFirstDead()
    const body = this.sprite.body;
    const x = body.position.x + 55, y = body.position.y + 10
    if (!bullet) {
      bullet = this.bullets.create(x, y, 'bullet');
      this.game.physics.enable(bullet, Phaser.Physics.ARCADE);
      bullet.body.allowGravity = false;
      bullet.smoothed = false;
    } else {
      bullet.reset(x, y)
    }
    bullet.body.velocity.x = this.BULLET_SPEED
  }

  update() {
    const game = this.game
    const body = this.sprite.body

    if (this.auto_run) {
      this.run()
    }

    if (this.auto_jump && this.sprite.body.touching.down) {
      this.do_auto_jump()
    }

    // Kill the player if he drops bellow the level
    if (body.y > this.game.height) {
      this.sprite.kill();
    }

    // clean up bullets that have gone to far off screen
    this.bullets.forEachAlive((bullet) => {
      // use a little bit of a buffer before removing it
      if (bullet.body.position.x > this.game.camera.x + this.game.camera.width + 100) {
         bullet.kill()
         console.log("killed", bullet)
      }
    })

    this.animate()
  }

  do_auto_jump() {
    let [px, py] = this.level.toBlockCoords(this.sprite.body.position.x - .5  * Level.BLOCK_SIZE, this.sprite.body.position.y);
    // if there is a hole in the ground in front of the player
    for (let x = px + 1; x > px; x--) {
      if (this.level.getBlockAt(x, py - 1) === undefined) {
        this.jump();
        return;
      }
    }

    // if there is a wall in front of the player
    for (let x = px; x < px + 3; x++) {
      for (let y = py; y < py + 5; y++) {
        if (this.level.getBlockAt(x, y)) {
          this.jump();
          return;
        }
      }
    }
  }

  get height() {
    return this.sprite.height
  }

  get width() {
    return this.sprite.width
  }

  get velocity() {
    return this.sprite.velocity
  }

  get position() {
    return this.sprite.position
  }
}
