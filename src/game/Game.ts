import { Input } from './Input';
import { audio } from './Audio';

const GRAVITY = 0.45;
const FRICTION = 0.8;
const JUMP_FORCE = -7.5;
const MOVE_SPEED = 3.5;
const DASH_SPEED = 12;
const DASH_DURATION = 12;
const DASH_COOLDOWN = 40;
const ATTACK_DURATION = 12;
const ATTACK_COOLDOWN = 20;
const PLUNGE_SPEED = 14;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function checkCollision(r1: Rect, r2: Rect) {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isBlood: boolean;
  stopped: boolean = false;

  constructor(x: number, y: number, color: string, vx?: number, vy?: number, isBlood: boolean = false) {
    this.x = x;
    this.y = y;
    this.vx = vx !== undefined ? vx : (Math.random() - 0.5) * 6;
    this.vy = vy !== undefined ? vy : (Math.random() - 0.5) * 6 - 2;
    this.life = isBlood ? 300 + Math.random() * 200 : 15 + Math.random() * 15;
    this.maxLife = this.life;
    this.color = color;
    this.size = isBlood ? 2 + Math.random() * 2 : 2 + Math.random() * 4;
    this.isBlood = isBlood;
  }

  update(game: Game) {
    if (this.stopped) {
      this.life--;
      return;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY * 0.6;
    this.vx *= 0.95;
    this.life--;

    if (this.isBlood) {
      for (const plat of game.platforms) {
        if (this.y > plat.y && this.y < plat.y + 10 && this.x > plat.x && this.x < plat.x + plat.w && this.vy > 0) {
          this.y = plat.y;
          this.stopped = true;
          this.vx = 0;
          this.vy = 0;
          this.size = 3 + Math.random() * 3; // Splat
          break;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.isBlood && this.stopped ? Math.min(1, this.life / 60) : this.life / this.maxLife;
    
    if (!this.isBlood) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 4;
    }
    
    if (this.isBlood && this.stopped) {
      ctx.fillRect(Math.floor(this.x - cameraX - this.size/2), Math.floor(this.y - cameraY), this.size * 1.5, 2);
    } else {
      ctx.fillRect(Math.floor(this.x - cameraX), Math.floor(this.y - cameraY), this.size, this.size);
    }
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

class FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  vy: number;

  constructor(x: number, y: number, text: string, color: string) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 40;
    this.maxLife = 40;
    this.vy = -2;
  }

  update() {
    this.y += this.vy;
    this.vy *= 0.9;
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    
    // Shadow
    ctx.fillStyle = '#000';
    ctx.fillText(this.text, Math.floor(this.x - cameraX) + 1, Math.floor(this.y - cameraY) + 1);
    
    // Text
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, Math.floor(this.x - cameraX), Math.floor(this.y - cameraY));
    
    ctx.globalAlpha = 1;
  }
}

class Item {
  x: number;
  y: number;
  w: number = 10;
  h: number = 10;
  type: 'score' | 'health';
  vy: number = 0;
  hoverOffset: number = 0;
  hoverTimer: number = 0;

  constructor(x: number, y: number, type: 'score' | 'health') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vy = -3; // Pop up slightly when spawned
  }

  update(game: Game) {
    this.hoverTimer += 0.1;
    this.hoverOffset = Math.sin(this.hoverTimer) * 3;

    // Gravity and platform collision
    this.vy += GRAVITY * 0.5;
    this.y += this.vy;
    
    for (const plat of game.platforms) {
      if (checkCollision(this, plat) && this.vy > 0) {
        this.y = plat.y - this.h;
        this.vy = 0;
      }
    }

    // Player pickup
    if (checkCollision(this, game.player.getRect())) {
      audio.playItem();
      if (this.type === 'score') {
        game.score += 50;
        game.floatingTexts.push(new FloatingText(this.x, this.y, "+50", "#fbbf24")); // Amber 400
        for(let i=0; i<10; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#fbbf24'));
      } else if (this.type === 'health') {
        const healAmount = 30;
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
        game.floatingTexts.push(new FloatingText(this.x, this.y, `+${healAmount} HP`, "#22c55e")); // Green 500
        for(let i=0; i<10; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#22c55e'));
      }
      return true; // Picked up
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY + this.hoverOffset);

    if (this.type === 'score') {
      // Diamond shape for score
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(drawX + this.w/2, drawY);
      ctx.lineTo(drawX + this.w, drawY + this.h/2);
      ctx.lineTo(drawX + this.w/2, drawY + this.h);
      ctx.lineTo(drawX, drawY + this.h/2);
      ctx.fill();
    } else {
      // Cross shape for health
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(drawX + 3, drawY, 4, 10);
      ctx.fillRect(drawX, drawY + 3, 10, 4);
    }
  }
}

class Projectile {
  x: number;
  y: number;
  w: number = 8;
  h: number = 4;
  vx: number;
  vy: number;
  life: number = 120;
  isEnemy: boolean;
  color: string;

  constructor(x: number, y: number, vx: number, vy: number, isEnemy: boolean) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.isEnemy = isEnemy;
    this.color = isEnemy ? '#fb7185' : '#38bdf8'; // Rose 400 for enemy projectiles
  }

  update(game: Game) {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    if (game.frameCount % 2 === 0) {
      game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, this.color, 0, 0));
    }

    for (const plat of game.platforms) {
      if (!plat.isOneWay && checkCollision(this, plat)) {
        this.life = 0;
        for(let i=0; i<5; i++) game.particles.push(new Particle(this.x, this.y, this.color));
        return;
      }
    }

    if (this.isEnemy) {
      if (checkCollision(this, game.player.getRect())) {
        if (game.player.takeDamage(15, Math.sign(this.vx) * 4)) {
          this.life = 0;
          game.screenShake = 5;
          for(let i=0; i<10; i++) game.particles.push(new Particle(this.x, this.y, '#991b1b', undefined, undefined, true));
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.fillRect(drawX, drawY, this.w, this.h);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.fillRect(drawX + (this.vx > 0 ? this.w - 2 : 0), drawY + 1, 2, 2);
  }
}

class AmbientParticle {
  x: number; y: number; vx: number; vy: number; size: number; alpha: number;
  constructor(w: number, h: number, camX: number, camY: number) {
    this.x = camX + Math.random() * w;
    this.y = camY + Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = -Math.random() * 0.5 - 0.1;
    this.size = Math.random() * 2 + 1;
    this.alpha = Math.random() * 0.3 + 0.1;
  }
  update(w: number, h: number, camX: number, camY: number) {
    this.x += this.vx; this.y += this.vy;
    if (this.y < camY - 10) this.y = camY + h + 10;
    if (this.x < camX - 10) this.x = camX + w + 10;
    if (this.x > camX + w + 10) this.x = camX - 10;
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
    ctx.fillRect(Math.floor(this.x - camX), Math.floor(this.y - camY), this.size, this.size);
  }
}

class Portal {
  x: number; y: number; w: number = 40; h: number = 60; timer: number = 0;
  constructor(x: number, y: number) { this.x = x; this.y = y; }
  update(game: Game) {
    this.timer += 0.05;
    if (checkCollision({x: this.x, y: this.y, w: this.w, h: this.h}, game.player.getRect())) {
      game.nextLevel();
    }
  }
  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const cx = Math.floor(this.x - cameraX + this.w/2);
    const cy = Math.floor(this.y - cameraY + this.h/2);
    
    // Draw "ENTER PORTAL" text above
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('ENTER PORTAL', cx, cy - this.h/2 - 10);
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.timer);
    for(let i=0; i<3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + Math.sin(this.timer*2)*0.2})`;
      ctx.beginPath();
      ctx.ellipse(0, 10, 8, 25, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();
  }
}

class Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number = 0;
  vy: number = 0;
  color: string = '#fff';
  hp: number = 100;
  maxHp: number = 100;
  facingRight: boolean = true;
  invulnerableTimer: number = 0;
  
  scaleX: number = 1;
  scaleY: number = 1;
  touchingWall: number = 0;
  isGrounded: boolean = false;
  wasGrounded: boolean = false;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  getRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  takeDamage(amount: number, knockbackX: number) {
    if (this.invulnerableTimer > 0) return false;
    this.hp -= amount;
    this.vx = knockbackX;
    this.vy = -3;
    this.invulnerableTimer = 10;
    this.scaleX = 0.7;
    this.scaleY = 1.3;
    
    if (this instanceof Player) {
      audio.playPlayerHit();
    } else {
      audio.playHit();
    }
    
    return true;
  }

  updateJuice() {
    this.scaleX += (1 - this.scaleX) * 0.2;
    this.scaleY += (1 - this.scaleY) * 0.2;
  }
}

class Player extends Entity {
  dashTimer: number = 0;
  dashCooldownTimer: number = 0;
  attackTimer: number = 0;
  attackCooldownTimer: number = 0;
  comboCount: number = 0;
  comboWindowTimer: number = 0;
  hitCount: number = 0;
  hitTimer: number = 0;
  jumpsLeft: number = 2;
  trail: {x: number, y: number, facingRight: boolean, life: number}[] = [];
  
  plungeState: 'none' | 'falling' | 'landed' = 'none';
  plungeTimer: number = 0;
  
  droppingThrough: boolean = false;
  isSpawning: boolean = false;
  spawnAnimTimer: number = 0;
  isVictorious: boolean = false;

  constructor(x: number, y: number) {
    super(x, y, 12, 24);
    this.color = '#10b981';
  }

  update(input: Input, game: Game) {
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer--;
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;
    if (this.comboWindowTimer > 0) this.comboWindowTimer--;
    else this.comboCount = 0;
    
    if (this.hitTimer > 0) this.hitTimer--;
    else this.hitCount = 0;

    this.updateJuice();

    if (this.isSpawning) {
      this.spawnAnimTimer--;
      if (this.spawnAnimTimer <= 0) {
        this.isSpawning = false;
        this.scaleX = 2.0;
        this.scaleY = 0.2;
        game.screenShake = 10;
        audio.playHit();
        for(let i=0; i<30; i++) {
          game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, '#ffffff', (Math.random()-0.5)*12, -Math.random()*8, true));
        }
        game.floatingTexts.push(new FloatingText(this.x, this.y - 20, "START!", "#ffffff", 2));
      } else {
        if (this.spawnAnimTimer % 2 === 0) {
          game.particles.push(new Particle(this.x + this.w/2 + (Math.random()-0.5)*20, this.y + this.h, '#ffffff', 0, -Math.random()*5 - 2, true));
        }
      }
      this.vy += GRAVITY;
      this.wasGrounded = this.isGrounded;
      return;
    }

    if (this.isGrounded && !this.wasGrounded) {
      if (this.plungeState === 'falling') {
        this.plungeState = 'landed';
        this.plungeTimer = 15;
        this.scaleX = 1.8;
        this.scaleY = 0.4;
        game.screenShake = 15;
        game.hitStop = 4;
        audio.playHit();
        
        for(let i=0; i<20; i++) {
          game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, '#fff', (Math.random()-0.5)*10, -Math.random()*3));
        }

        const plungeHitbox = { x: this.x - 40, y: this.y - 10, w: this.w + 80, h: this.h + 20 };
        for (const enemy of game.enemies) {
          if (checkCollision(plungeHitbox, enemy.getRect())) {
            const kb = enemy.x > this.x ? 8 : -8;
            if (enemy.takeDamage(40, kb)) {
              this.hitCount++;
              this.hitTimer = 180;
              game.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 10, "40!", "#facc15"));
              for(let i=0; i<15; i++) game.particles.push(new Particle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#991b1b', undefined, undefined, true));
            }
          }
        }
      } else {
        this.scaleX = 1.4;
        this.scaleY = 0.6;
        for(let i=0; i<5; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, '#cbd5e1'));
      }
    }
    this.wasGrounded = this.isGrounded;

    if (this.plungeState === 'landed') {
      this.plungeTimer--;
      this.vx *= 0.5;
      if (this.plungeTimer <= 0) {
        this.plungeState = 'none';
      }
    }

    if (this.dashTimer > 0 || Math.abs(this.vx) > MOVE_SPEED + 1 || this.plungeState === 'falling') {
      if (game.frameCount % 2 === 0) {
        this.trail.push({x: this.x, y: this.y, facingRight: this.facingRight, life: 10});
      }
    }
    this.trail.forEach(t => t.life--);
    this.trail = this.trail.filter(t => t.life > 0);

    // Drop through one-way platforms
    this.droppingThrough = input.isDown('ArrowDown') || input.isDown('KeyS');

    if (this.plungeState === 'falling') {
      this.vy = PLUNGE_SPEED;
      this.vx = 0;
      this.invulnerableTimer = 2;
    } else if (this.dashTimer > 0) {
      this.dashTimer--;
      this.vy = 0;
      this.vx = this.facingRight ? DASH_SPEED : -DASH_SPEED;
      this.invulnerableTimer = 2;
    } else if (this.plungeState !== 'landed') {
      if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
        this.vx -= 1.5;
        this.facingRight = false;
      } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
        this.vx += 1.5;
        this.facingRight = true;
      }

      this.vx *= FRICTION;
      if (this.vx > MOVE_SPEED) this.vx = MOVE_SPEED;
      if (this.vx < -MOVE_SPEED) this.vx = -MOVE_SPEED;

      if (this.touchingWall !== 0 && this.vy > 0 && !this.isGrounded) {
        this.vy *= 0.7;
        if (Math.random() < 0.2) {
           game.particles.push(new Particle(this.touchingWall === 1 ? this.x + this.w : this.x, this.y + this.h, '#cbd5e1', 0, -1));
        }
      }

      if ((input.isJustPressed('Space') || input.isJustPressed('ArrowUp') || input.isJustPressed('KeyW'))) {
        // Prevent jumping if we are trying to drop down
        if (!this.droppingThrough) {
          if (this.touchingWall !== 0 && !this.isGrounded) {
            this.vy = JUMP_FORCE;
            this.vx = this.touchingWall === 1 ? -MOVE_SPEED * 1.5 : MOVE_SPEED * 1.5;
            this.jumpsLeft = 1;
            this.scaleX = 0.6; this.scaleY = 1.4;
            this.facingRight = this.touchingWall === -1;
            audio.playJump();
            for(let i=0; i<8; i++) game.particles.push(new Particle(this.touchingWall === 1 ? this.x + this.w : this.x, this.y + this.h/2, '#cbd5e1'));
          } else if (this.jumpsLeft > 0) {
            this.vy = JUMP_FORCE;
            
            if (this.jumpsLeft === 1) {
              // Double jump particles
              for(let i=0; i<8; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, '#94a3b8', (Math.random()-0.5)*4, Math.random()*2));
            } else {
              // Single jump particles
              for(let i=0; i<5; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, '#fff'));
            }

            this.jumpsLeft--;
            this.isGrounded = false;
            this.scaleX = 0.6; this.scaleY = 1.4;
            audio.playJump();
          }
        }
      }

      if ((input.isJustPressed('ShiftLeft') || input.isJustPressed('KeyL') || input.isJustPressed('KeyC')) && this.dashCooldownTimer <= 0) {
        this.dashTimer = DASH_DURATION;
        this.dashCooldownTimer = DASH_COOLDOWN;
        this.scaleX = 1.5; this.scaleY = 0.5;
        audio.playDash();
        game.screenShake = 3;
        // Dash particles
        for(let i=0; i<10; i++) {
          game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#6ee7b7', (Math.random()-0.5)*10, (Math.random()-0.5)*10));
        }
      }

      if ((input.isJustPressed('KeyJ') || input.isJustPressed('KeyX')) && this.attackCooldownTimer <= 0) {
        if (!this.isGrounded && this.droppingThrough) {
          this.plungeState = 'falling';
          this.vy = PLUNGE_SPEED;
          this.vx = 0;
          this.scaleX = 0.5; this.scaleY = 1.5;
          audio.playAttack();
        } else {
          // Combo logic
          if (this.comboWindowTimer > 0) {
            this.comboCount = (this.comboCount + 1) % 3;
          } else {
            this.comboCount = 0;
          }
          
          this.attackTimer = ATTACK_DURATION;
          this.attackCooldownTimer = 10; // Short cooldown to allow combo
          this.comboWindowTimer = 30; // Window to press next attack
          
          // Lunge forward slightly on attack, more on 3rd hit
          this.vx = this.facingRight ? (this.comboCount === 2 ? 8 : 4) : (this.comboCount === 2 ? -8 : -4);
          this.scaleX = 1.2; this.scaleY = 0.8;
          audio.playAttack();
        }
      }
    }

    if (this.dashTimer <= 0 && this.plungeState !== 'falling') {
      this.vy += GRAVITY;
    }

    // Goomba stomp logic (Mario style)
    if (this.vy > 0 && this.plungeState === 'none' && this.dashTimer <= 0) {
      const footHitbox = { x: this.x, y: this.y + this.h - 4, w: this.w, h: 8 };
      for (const enemy of game.enemies) {
        if (checkCollision(footHitbox, enemy.getRect()) && this.y + this.h < enemy.y + enemy.h/2) {
          // Bounce off enemy
          this.vy = JUMP_FORCE * 0.8;
          this.jumpsLeft = 1; // Restore double jump
          this.scaleX = 0.8; this.scaleY = 1.2;
          
          if (enemy.takeDamage(20, 0)) {
            this.hitCount++;
            this.hitTimer = 180;
            game.hitStop = 2;
            game.screenShake = 4;
            game.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 10, "STOMP!", "#fff"));
            for(let i=0; i<5; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, '#fff'));
          }
        }
      }
    }

    if (this.attackTimer > 0) {
      this.attackTimer--;
      if (this.attackTimer === ATTACK_DURATION - 3) {
        // Adjust hitbox and damage based on combo
        const isFinisher = this.comboCount === 2;
        const hitW = isFinisher ? 60 : 45;
        const hitH = isFinisher ? 45 : 35;
        const hitX = this.facingRight ? this.x + this.w : this.x - hitW;
        const hitY = this.y - (isFinisher ? 20 : 10);
        const hitbox = { x: hitX, y: hitY, w: hitW, h: hitH };
        const dmg = isFinisher ? 40 : 20;

        let hitSomething = false;

        for (const enemy of game.enemies) {
          if (checkCollision(hitbox, enemy.getRect())) {
            const kb = this.facingRight ? (isFinisher ? 10 : 4) : (isFinisher ? -10 : -4);
            if (enemy.takeDamage(dmg, kb)) {
              this.hitCount++;
              this.hitTimer = 180;
              hitSomething = true;
              if (isFinisher) enemy.vy = -5; // Knock up on finisher
              
              for(let i=0; i< (isFinisher ? 15 : 8); i++) {
                const vx = this.facingRight ? Math.random() * 5 : -Math.random() * 5;
                game.particles.push(new Particle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#facc15', vx, (Math.random()-0.5)*4));
              }
              for(let i=0; i< (isFinisher ? 20 : 12); i++) {
                 const vx = this.facingRight ? Math.random() * 6 : -Math.random() * 6;
                 game.particles.push(new Particle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#991b1b', vx, (Math.random()-0.5)*5 - 2, true));
              }
              game.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 10, dmg.toString(), isFinisher ? "#f97316" : "#facc15", isFinisher ? 1.5 : 1));
            }
          }
        }

        if (hitSomething) {
          game.hitStop = isFinisher ? 8 : 4; 
          game.screenShake = isFinisher ? 12 : 6;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    this.trail.forEach(t => {
      ctx.globalAlpha = (t.life / 10) * 0.5;
      ctx.fillStyle = this.plungeState === 'falling' ? '#facc15' : '#6ee7b7';
      ctx.fillRect(Math.floor(t.x - cameraX), Math.floor(t.y - cameraY), this.w, this.h);
    });
    ctx.globalAlpha = 1;

    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    if (this.isSpawning) {
      const progress = this.spawnAnimTimer / 60;
      ctx.fillStyle = `rgba(255, 255, 255, ${progress * 0.8})`;
      ctx.fillRect(drawX + this.w/2 - 20 * progress, drawY + this.h - 1000, 40 * progress, 1000);
      
      ctx.beginPath();
      ctx.ellipse(drawX + this.w/2, drawY + this.h, 30 * progress, 10 * progress, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1 - progress;
    } else if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.save();
    ctx.translate(drawX + this.w/2, drawY + this.h);
    ctx.scale(this.scaleX, this.scaleY);
    
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w/2, -this.h, this.w, this.h);

    ctx.fillStyle = '#fff';
    if (this.isVictorious) {
      // Happy face facing camera
      ctx.fillRect(-this.w/2 + 2, -this.h + 4, 3, 3); // Left eye
      ctx.fillRect(this.w/2 - 5, -this.h + 4, 3, 3);  // Right eye
      // Smile
      ctx.beginPath();
      ctx.arc(0, -this.h + 12, 4, 0, Math.PI, false);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Normal eye
      const eyeX = this.facingRight ? this.w/2 - 4 : -this.w/2 + 2;
      ctx.fillRect(eyeX, -this.h + 4, 3, 3);
    }
    
    ctx.restore();
    ctx.globalAlpha = 1;

    if (this.attackTimer > 0) {
      const progress = 1 - (this.attackTimer / ATTACK_DURATION);
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
      ctx.beginPath();
      const cx = this.facingRight ? drawX + this.w/2 : drawX + this.w/2;
      const cy = drawY + this.h / 2;
      const radius = this.comboCount === 2 ? 60 : 45; // Bigger swoosh on finisher
      
      let startAngle, endAngle;
      if (this.comboCount === 0) {
        // Horizontal slash
        startAngle = -Math.PI/2; endAngle = startAngle + Math.PI * progress * 1.3;
      } else if (this.comboCount === 1) {
        // Upward slash
        startAngle = Math.PI/4; endAngle = startAngle - Math.PI * progress * 1.3;
      } else {
        // Heavy downward slam
        startAngle = -Math.PI; endAngle = startAngle + Math.PI * progress * 1.8;
      }

      if (!this.facingRight) {
         // Mirror angles
         const temp = startAngle;
         startAngle = Math.PI - endAngle;
         endAngle = Math.PI - temp;
      }

      ctx.arc(cx, cy, radius, startAngle, endAngle, !this.facingRight && this.comboCount !== 1);
      ctx.lineTo(cx, cy);
      ctx.fill();
    }
  }
}

class Enemy extends Entity {
  patrolStartX: number;
  patrolDist: number = 100;
  state: 'patrol' | 'chase' | 'attack' = 'patrol';
  attackTimer: number = 0;
  displayHp: number;

  constructor(x: number, y: number, hpMultiplier: number = 1) {
    super(x, y, 16, 22);
    this.color = '#ef4444';
    this.patrolStartX = x;
    this.vx = 1;
    this.hp = 60 * hpMultiplier;
    this.maxHp = 60 * hpMultiplier;
    this.displayHp = this.hp;
  }

  update(game: Game) {
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    this.updateJuice();

    this.vy += GRAVITY;
    this.displayHp += (this.hp - this.displayHp) * 0.1;

    const distToPlayer = Math.hypot(game.player.x - this.x, game.player.y - this.y);

    if (this.state === 'patrol') {
      if (this.x > this.patrolStartX + this.patrolDist) {
        this.vx = -1;
        this.facingRight = false;
      } else if (this.x < this.patrolStartX - this.patrolDist) {
        this.vx = 1;
        this.facingRight = true;
      }

      if (distToPlayer < 180) {
        this.state = 'chase';
        this.scaleX = 1.2; this.scaleY = 0.8;
      }
    } else if (this.state === 'chase') {
      if (game.player.x > this.x) {
        this.vx = 1.8;
        this.facingRight = true;
      } else {
        this.vx = -1.8;
        this.facingRight = false;
      }

      if (distToPlayer < 35) {
        this.state = 'attack';
        this.attackTimer = 35;
      } else if (distToPlayer > 250) {
        this.state = 'patrol';
        this.patrolStartX = this.x;
      }
    } else if (this.state === 'attack') {
      this.vx *= 0.8;
      this.attackTimer--;
      
      if (this.attackTimer === 20) {
         this.scaleX = 1.3; this.scaleY = 0.7;
      }

      if (this.attackTimer === 10) {
        this.scaleX = 0.8; this.scaleY = 1.2;
        this.vx = this.facingRight ? 6 : -6;
        
        const hitW = 25;
        const hitH = 25;
        const hitX = this.facingRight ? this.x + this.w : this.x - hitW;
        const hitY = this.y;
        
        if (checkCollision({ x: hitX, y: hitY, w: hitW, h: hitH }, game.player.getRect())) {
          const kb = this.facingRight ? 8 : -8;
          if (game.player.takeDamage(15, kb)) {
             game.hitStop = 6;
             game.screenShake = 12;
             for(let i=0; i<15; i++) game.particles.push(new Particle(game.player.x, game.player.y, '#991b1b', undefined, undefined, true));
             game.floatingTexts.push(new FloatingText(game.player.x, game.player.y - 10, "15", "#ef4444"));
          }
        }
      }
      if (this.attackTimer <= 0) {
        this.state = 'chase';
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const isTelegraphing = this.state === 'attack' && this.attackTimer > 10 && this.attackTimer < 25;
    
    ctx.save();
    ctx.translate(drawX + this.w/2, drawY + this.h);
    ctx.scale(this.scaleX, this.scaleY);

    ctx.fillStyle = isTelegraphing ? '#fff' : this.color;
    ctx.fillRect(-this.w/2, -this.h, this.w, this.h);
    
    ctx.fillStyle = isTelegraphing ? '#ef4444' : '#000';
    const eyeX = this.facingRight ? this.w/2 - 5 : -this.w/2 + 2;
    ctx.fillRect(eyeX, -this.h + 4, 3, 3);

    ctx.restore();
    ctx.globalAlpha = 1;

    if (this.hp < this.maxHp) {
      ctx.fillStyle = '#000';
      ctx.fillRect(drawX, drawY - 8, this.w, 4);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(drawX, drawY - 8, this.w * (this.displayHp / this.maxHp), 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(drawX, drawY - 8, this.w * (this.hp / this.maxHp), 4);
    }

    if (this.state === 'attack' && this.attackTimer < 10 && this.attackTimer > 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      const hitW = 25;
      const hitH = 4;
      const hitX = this.facingRight ? drawX + this.w : drawX - hitW;
      ctx.fillRect(hitX, drawY + this.h/2, hitW, hitH);
    }
  }
}

class BossEnemy extends Enemy {
  phase: 1 | 2 | 3 = 1;
  actionTimer: number = 0;
  actionState: 'idle' | 'telegraph' | 'attack' | 'recover' = 'idle';
  startX: number;
  startY: number;
  active: boolean = false;

  constructor(x: number, y: number, hpMultiplier: number = 1) {
    super(x, y, hpMultiplier);
    this.w = 40;
    this.h = 60;
    this.color = '#9d174d'; // Pink 800
    this.hp = 300 * hpMultiplier;
    this.maxHp = 300 * hpMultiplier;
    this.displayHp = this.hp;
    this.startX = x;
    this.startY = y;
  }

  takeDamage(amount: number, knockbackX: number) {
    if (this.invulnerableTimer > 0) return false;
    this.hp -= amount;
    // Boss takes less knockback and no vertical knockback
    if (this.actionState !== 'attack' || this.phase !== 3) {
      this.vx = knockbackX * 0.2;
    }
    this.invulnerableTimer = 10;
    this.scaleX = 0.8;
    this.scaleY = 1.2;
    audio.playHit();
    return true;
  }

  update(game: Game) {
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    this.updateJuice();
    this.displayHp += (this.hp - this.displayHp) * 0.1;

    const distToPlayer = Math.hypot(game.player.x - this.x, game.player.y - this.y);
    if (distToPlayer < 600) {
      this.active = true;
    }

    // Determine phase
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.33 && this.phase !== 3) {
      this.phase = 3;
      this.color = '#f43f5e'; // Bright rose
      this.actionState = 'idle';
      this.actionTimer = 60;
      game.screenShake = 20;
      audio.playHit();
      game.floatingTexts.push(new FloatingText(this.x, this.y - 20, "PHASE 3!", "#ef4444"));
    } else if (hpPercent <= 0.66 && hpPercent > 0.33 && this.phase !== 2) {
      this.phase = 2;
      this.color = '#d946ef'; // Bright fuchsia
      this.actionState = 'idle';
      this.actionTimer = 60;
      game.screenShake = 20;
      audio.playHit();
      game.floatingTexts.push(new FloatingText(this.x, this.y - 20, "PHASE 2!", "#ef4444"));
    }

    this.facingRight = game.player.x > this.x;

    // Physics
    if (this.actionState !== 'attack' || this.phase !== 3) {
      this.vy += GRAVITY;
    }

    if (this.actionState === 'idle') {
      this.vx *= 0.8;
      this.actionTimer--;
      if (this.actionTimer <= 0 && distToPlayer < 400) {
        this.actionState = 'telegraph';
        if (this.phase === 1) {
          this.actionTimer = 40;
          this.scaleX = 1.3; this.scaleY = 0.7;
        } else if (this.phase === 2) {
          this.actionTimer = 30;
          this.scaleX = 0.8; this.scaleY = 1.2;
        } else if (this.phase === 3) {
          this.actionTimer = 20;
          this.scaleX = 1.5; this.scaleY = 0.5;
        }
      }
    } else if (this.actionState === 'telegraph') {
      this.vx *= 0.8;
      this.actionTimer--;
      if (this.actionTimer <= 0) {
        this.actionState = 'attack';
        if (this.phase === 1) {
          // Jump smash
          this.vy = -12;
          this.vx = this.facingRight ? 4 : -4;
          this.actionTimer = 100; // Max air time
          this.scaleX = 0.7; this.scaleY = 1.3;
          audio.playJump();
        } else if (this.phase === 2) {
          // Shoot burst
          this.actionTimer = 45; // Shoot duration
        } else if (this.phase === 3) {
          // Dash
          this.vy = 0;
          this.vx = this.facingRight ? 15 : -15;
          this.actionTimer = 20;
          audio.playDash();
        }
      }
    } else if (this.actionState === 'attack') {
      if (this.phase === 1) {
        // Wait to land
        if (this.vy === 0 && this.actionTimer < 90) { // Landed
          game.screenShake = 15;
          audio.playHit();
          this.scaleX = 1.5; this.scaleY = 0.5;
          this.actionState = 'recover';
          this.actionTimer = 40;
          
          // Shockwaves
          game.projectiles.push(new Projectile(this.x + this.w, this.y + this.h - 10, 6, 0, true));
          game.projectiles.push(new Projectile(this.x, this.y + this.h - 10, -6, 0, true));
        }
        this.actionTimer--;
        if (this.actionTimer <= 0) this.actionState = 'recover';
      } else if (this.phase === 2) {
        this.vx *= 0.8;
        if (this.actionTimer % 15 === 0) {
          const pVx = this.facingRight ? 6 : -6;
          game.projectiles.push(new Projectile(this.x + this.w/2, this.y + this.h/2, pVx, (Math.random()-0.5)*2, true));
          audio.playAttack();
          this.scaleX = 0.9; this.scaleY = 1.1;
          for(let i=0; i<5; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#fff'));
        }
        this.actionTimer--;
        if (this.actionTimer <= 0) {
          this.actionState = 'recover';
          this.actionTimer = 30;
        }
      } else if (this.phase === 3) {
        this.vy = 0; // Stay in air during dash
        if (this.actionTimer % 3 === 0) {
          game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, this.color));
        }
        this.actionTimer--;
        if (this.actionTimer <= 0 || this.vx === 0) {
          this.actionState = 'recover';
          this.actionTimer = 50;
        }
      }
    } else if (this.actionState === 'recover') {
      this.vx *= 0.8;
      this.actionTimer--;
      if (this.actionTimer <= 0) {
        this.actionState = 'idle';
        this.actionTimer = this.phase === 3 ? 10 : 30;
      }
    }

    // Collision with player
    const isPhysicalAttack = this.actionState === 'attack' && (this.phase === 1 || this.phase === 3);
    if (this.active && isPhysicalAttack && checkCollision(this.getRect(), game.player.getRect())) {
      const kb = game.player.x > this.x ? 12 : -12;
      if (game.player.takeDamage(20, kb)) {
        game.hitStop = 8;
        game.screenShake = 15;
        for(let i=0; i<15; i++) game.particles.push(new Particle(game.player.x, game.player.y, '#991b1b', undefined, undefined, true));
        game.floatingTexts.push(new FloatingText(game.player.x, game.player.y - 10, "20", "#ef4444"));
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    
    ctx.save();
    ctx.translate(drawX + this.w/2, drawY + this.h);
    ctx.scale(this.scaleX, this.scaleY);

    ctx.fillStyle = this.actionState === 'telegraph' && Math.floor(Date.now() / 100) % 2 === 0 ? '#fff' : this.color;
    ctx.fillRect(-this.w/2, -this.h, this.w, this.h);
    
    // White outline for better visibility
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w/2, -this.h, this.w, this.h);
    
    ctx.fillStyle = '#000';
    const eyeX = this.facingRight ? this.w/2 - 10 : -this.w/2 + 4;
    ctx.fillRect(eyeX, -this.h + 10, 6, 6);
    
    // Angry eyebrows
    ctx.beginPath();
    ctx.moveTo(eyeX - 2, -this.h + 6);
    ctx.lineTo(eyeX + 8, -this.h + 10);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;

    // Boss HP Bar (Large, centered at bottom of screen)
    if (this.active && this.hp < this.maxHp) {
      const barW = 300;
      const barH = 12;
      const barX = 200 - barW / 2; // Centered on 400 width canvas
      const barY = 200; // Near bottom of 225 height canvas
      
      ctx.fillStyle = '#000';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(barX, barY, barW * (this.displayHp / this.maxHp), barH);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`BOSS - PHASE ${this.phase}`, 200, barY - 4);
      ctx.textAlign = 'left';
    }
  }
}

class ShooterEnemy extends Enemy {
  constructor(x: number, y: number, hpMultiplier: number = 1) {
    super(x, y, hpMultiplier);
    this.color = '#a855f7';
    this.hp = 40 * hpMultiplier;
    this.maxHp = 40 * hpMultiplier;
    this.displayHp = this.hp;
  }

  update(game: Game) {
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    this.updateJuice();

    this.vy += GRAVITY;
    this.displayHp += (this.hp - this.displayHp) * 0.1;

    const distToPlayer = Math.hypot(game.player.x - this.x, game.player.y - this.y);
    this.facingRight = game.player.x > this.x;

    if (this.state === 'patrol') {
      this.vx = 0;
      if (distToPlayer < 250) {
        this.state = 'chase';
      }
    } else if (this.state === 'chase') {
      if (distToPlayer < 100) {
        this.vx = this.facingRight ? -1.5 : 1.5;
      } else if (distToPlayer > 200) {
        this.vx = this.facingRight ? 1.5 : -1.5;
      } else {
        this.vx = 0;
        this.state = 'attack';
        this.attackTimer = 50;
      }

      if (distToPlayer > 300) {
        this.state = 'patrol';
      }
    } else if (this.state === 'attack') {
      this.vx *= 0.8;
      this.attackTimer--;
      
      if (this.attackTimer === 20) {
         this.scaleX = 1.2; this.scaleY = 0.8;
      }

      if (this.attackTimer === 0) {
        this.scaleX = 0.8; this.scaleY = 1.2;
        const pVx = this.facingRight ? 5 : -5;
        game.projectiles.push(new Projectile(this.x + this.w/2, this.y + this.h/2, pVx, 0, true));
        this.state = 'chase';
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    super.draw(ctx, cameraX, cameraY);
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    ctx.fillStyle = '#fff';
    const gunX = this.facingRight ? drawX + this.w : drawX - 6;
    ctx.fillRect(gunX, drawY + this.h/2, 6, 2);
  }
}

class FlyingEnemy extends Enemy {
  startY: number;
  hoverTimer: number = 0;

  constructor(x: number, y: number, hpMultiplier: number = 1) {
    super(x, y, hpMultiplier);
    this.color = '#38bdf8'; // Light blue
    this.hp = 30 * hpMultiplier;
    this.maxHp = 30 * hpMultiplier;
    this.displayHp = this.hp;
    this.startY = y;
    this.w = 14;
    this.h = 14;
  }

  update(game: Game) {
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    this.updateJuice();
    this.displayHp += (this.hp - this.displayHp) * 0.1;
    this.hoverTimer += 0.05;

    const distToPlayer = Math.hypot(game.player.x - this.x, game.player.y - this.y);
    this.facingRight = game.player.x > this.x;

    if (this.state === 'patrol') {
      this.vx = Math.sin(this.hoverTimer) * 1;
      this.vy = Math.cos(this.hoverTimer * 1.5) * 0.5;
      
      if (distToPlayer < 250) {
        this.state = 'chase';
      }
    } else if (this.state === 'chase') {
      const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
      
      if (distToPlayer > 80) {
        this.vx = Math.cos(angle) * 2;
        this.vy = Math.sin(angle) * 2;
      } else {
        this.vx *= 0.8;
        this.vy *= 0.8;
        this.state = 'attack';
        this.attackTimer = 40;
      }

      if (distToPlayer > 350) {
        this.state = 'patrol';
      }
    } else if (this.state === 'attack') {
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.attackTimer--;
      
      if (this.attackTimer === 20) {
         this.scaleX = 1.3; this.scaleY = 0.7;
      }

      if (this.attackTimer === 0) {
        this.scaleX = 0.7; this.scaleY = 1.3;
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        // Dash towards player instead of shooting
        this.vx = Math.cos(angle) * 6;
        this.vy = Math.sin(angle) * 6;
        this.state = 'chase';
      }
    }

    // Collision with player
    if (checkCollision(this.getRect(), game.player.getRect())) {
      const kb = game.player.x > this.x ? 6 : -6;
      if (game.player.takeDamage(10, kb)) {
        game.hitStop = 4;
        game.screenShake = 8;
        for(let i=0; i<10; i++) game.particles.push(new Particle(game.player.x, game.player.y, '#991b1b', undefined, undefined, true));
        game.floatingTexts.push(new FloatingText(game.player.x, game.player.y - 10, "10", "#ef4444"));
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.save();
    ctx.translate(drawX + this.w/2, drawY + this.h/2);
    ctx.scale(this.scaleX, this.scaleY);
    
    // Wings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const wingOffset = Math.sin(this.hoverTimer * 10) * 5;
    ctx.fillRect(-this.w, -this.h/2 + wingOffset, this.w, 4);
    ctx.fillRect(0, -this.h/2 + wingOffset, this.w, 4);

    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.w/2, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#000';
    const eyeX = this.facingRight ? 2 : -4;
    ctx.fillRect(eyeX, -2, 3, 3);
    
    ctx.restore();
    ctx.globalAlpha = 1;

    if (this.hp < this.maxHp) {
      ctx.fillStyle = '#000';
      ctx.fillRect(drawX, drawY - 8, this.w, 4);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(drawX, drawY - 8, this.w * (this.displayHp / this.maxHp), 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(drawX, drawY - 8, this.w * (this.hp / this.maxHp), 4);
    }
  }
}

class Spike {
  x: number;
  y: number;
  w: number;
  h: number;

  constructor(x: number, y: number, w: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = 10;
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    ctx.fillStyle = '#94a3b8';
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    
    for (let i = 0; i < this.w; i += 10) {
      ctx.beginPath();
      ctx.moveTo(drawX + i, drawY + this.h);
      ctx.lineTo(drawX + i + 5, drawY);
      ctx.lineTo(drawX + i + 10, drawY + this.h);
      ctx.fill();
    }
  }
}

class Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isOneWay: boolean;

  constructor(x: number, y: number, w: number, h: number, isOneWay: boolean = false) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.isOneWay = isOneWay;
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);
    
    if (this.isOneWay) {
      // Draw one-way platform differently (thinner, wooden look)
      ctx.fillStyle = '#9a3412'; // Orange 800
      ctx.fillRect(drawX, drawY, this.w, this.h);
      ctx.fillStyle = '#c2410c'; // Orange 700
      ctx.fillRect(drawX, drawY, this.w, 2);
    } else {
      ctx.fillStyle = '#475569'; // Slate 600
      ctx.fillRect(drawX, drawY, this.w, this.h);
      ctx.fillStyle = '#64748b'; // Slate 500
      ctx.fillRect(drawX, drawY, this.w, 4);
      ctx.fillStyle = '#334155'; // Slate 700
      for(let i=0; i<this.w; i+=20) {
        ctx.fillRect(drawX + i, drawY + 10, 2, this.h - 10);
      }
      for(let i=10; i<this.h; i+=20) {
        ctx.fillRect(drawX, drawY + i, this.w, 2);
      }
    }
  }
}

export class Game {
  player: Player;
  enemies: Enemy[] = [];
  platforms: Platform[] = [];
  spikes: Spike[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  projectiles: Projectile[] = [];
  items: Item[] = [];
  ambientParticles: AmbientParticle[] = [];
  portal: Portal | null = null;
  
  cameraX: number = 0;
  cameraY: number = 0;
  screenShake: number = 0;
  hitStop: number = 0;
  frameCount: number = 0;
  victoryAnimTimer: number = 0;
  levelStartTimer: number = 0;
  
  width: number;
  height: number;
  score: number = 0;
  gameOver: boolean = false;
  gameWon: boolean = false;
  level: number = 1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.player = new Player(50, 300);
    for(let i=0; i<30; i++) this.ambientParticles.push(new AmbientParticle(width, height, 0, 0));
    this.initLevel();
    
    // Snap camera to player immediately
    this.cameraX = this.player.x - this.width / 2 + 60;
    this.cameraY = this.player.y - this.height / 2 - 40;
  }

  nextLevel() {
    this.level++;
    this.score += 500;
    if (this.level > 1) {
      this.victoryAnimTimer = 180;
      this.player.isVictorious = true;
      this.player.vx = 0;
      this.player.vy = 0;
      audio.playVictory();
      return;
    }
    this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, "LEVEL UP!", "#a855f7", 2));
    this.initLevel();
  }

  initLevel() {
    this.platforms = [];
    this.enemies = [];
    this.spikes = [];
    this.particles = [];
    this.projectiles = [];
    this.items = [];
    this.gameOver = false;
    this.gameWon = false;
    this.hitStop = 0;
    this.levelStartTimer = 120;
    
    // Keep player stats but reset position
    this.player.x = 50;
    this.player.y = 376;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isSpawning = true;
    this.player.spawnAnimTimer = 60;
    this.player.isVictorious = false;
    this.player.hp = this.player.maxHp; // Heal on level up
    
    const hpMult = 1 + (this.level - 1) * 0.5; // Enemies get 50% more HP per level

    // Floor (Solid)
    this.platforms.push(new Platform(-200, 400, 3500, 200, false));
    
    // Walls (Solid)
    this.platforms.push(new Platform(-200, -500, 50, 1100, false));
    this.platforms.push(new Platform(3300, -500, 50, 1100, false)); // Right Wall

    // Section 1: Vertical Climb
    this.platforms.push(new Platform(150, 300, 80, 8, true));
    this.platforms.push(new Platform(50, 200, 80, 8, true));
    this.platforms.push(new Platform(200, 100, 80, 8, true));
    this.platforms.push(new Platform(350, 0, 80, 8, true));
    this.enemies.push(new FlyingEnemy(250, 150, hpMult));
    this.enemies.push(new Enemy(350, -20, hpMult));

    // Section 2: High Platforms and Drops
    this.platforms.push(new Platform(500, -50, 200, 50, false));
    this.platforms.push(new Platform(800, 50, 100, 8, true));
    this.platforms.push(new Platform(950, 150, 100, 8, true));
    this.platforms.push(new Platform(1100, 250, 100, 8, true));
    this.enemies.push(new ShooterEnemy(600, -80, hpMult));
    this.enemies.push(new FlyingEnemy(900, 0, hpMult));
    this.enemies.push(new FlyingEnemy(1050, 100, hpMult));

    // Section 3: The Pit
    this.platforms.push(new Platform(1300, 300, 400, 50, false));
    this.spikes.push(new Spike(1350, 350, 300)); // Spikes in the pit
    this.platforms.push(new Platform(1300, 100, 80, 8, true));
    this.platforms.push(new Platform(1450, 0, 80, 8, true));
    this.platforms.push(new Platform(1600, 100, 80, 8, true));
    this.enemies.push(new Enemy(1350, 250, hpMult));
    this.enemies.push(new Enemy(1550, 250, hpMult));
    this.enemies.push(new FlyingEnemy(1450, -50, hpMult));

    // Section 4: Vertical Maze
    this.platforms.push(new Platform(1800, 200, 50, 200, false)); // Wall obstacle
    this.platforms.push(new Platform(1950, 100, 50, 300, false)); // Wall obstacle
    this.platforms.push(new Platform(1850, 300, 100, 8, true));
    this.platforms.push(new Platform(1850, 150, 100, 8, true));
    this.platforms.push(new Platform(2000, 250, 100, 8, true));
    this.platforms.push(new Platform(2000, 50, 100, 8, true));
    this.enemies.push(new ShooterEnemy(1850, 120, hpMult));
    this.enemies.push(new ShooterEnemy(2000, 20, hpMult));
    this.enemies.push(new FlyingEnemy(1900, 200, hpMult));

    // Section 5: Portal Area (High up)
    this.platforms.push(new Platform(2200, 0, 100, 8, true));
    this.platforms.push(new Platform(2400, -100, 100, 8, true));
    this.platforms.push(new Platform(2600, -200, 400, 50, false));
    this.enemies.push(new FlyingEnemy(2300, -50, hpMult));
    this.enemies.push(new FlyingEnemy(2500, -150, hpMult));
    this.enemies.push(new Enemy(2700, -250, hpMult));
    this.enemies.push(new ShooterEnemy(2850, -250, hpMult));
    
    // Section 6: Boss Arena
    this.items.push(new Item(2900, -220, 'health'));
    this.items.push(new Item(2930, -220, 'health'));
    this.items.push(new Item(2960, -220, 'health'));
    
    this.platforms.push(new Platform(2950, -400, 100, 8, true));
    this.platforms.push(new Platform(3050, -550, 100, 8, true));
    this.platforms.push(new Platform(3100, -200, 800, 50, false)); // Floor
    this.platforms.push(new Platform(3100, -600, 50, 400, false)); // Left wall
    this.platforms.push(new Platform(3850, -600, 50, 400, false)); // Right wall
    this.enemies.push(new BossEnemy(3500, -260, hpMult));
    
    // Portal spawns when boss dies
    this.portal = null;

    // Snap camera to player immediately
    this.cameraX = this.player.x - this.width / 2 + 60;
    this.cameraY = this.player.y - this.height / 2 - 40;
  }

  update(input: Input) {
    if (!audio.initialized && Object.keys(input.keys).length > 0) {
      audio.init();
    }

    this.frameCount++;
    if (this.levelStartTimer > 0) this.levelStartTimer--;

    if (this.victoryAnimTimer > 0) {
      this.victoryAnimTimer--;
      if (this.victoryAnimTimer <= 0) {
        this.gameWon = true;
      }
      // Still update player physics and particles during victory animation
      this.player.updateJuice();
      this.player.vy += GRAVITY;
      this.handlePhysics(this.player);
      
      for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].update();
        if (this.particles[i].life <= 0) this.particles.splice(i, 1);
      }
      for (const ft of this.floatingTexts) ft.update();
      this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
      
      // Spawn some celebratory particles
      if (this.frameCount % 5 === 0) {
        this.particles.push(new Particle(
          this.player.x + this.player.w / 2 + (Math.random() - 0.5) * 40,
          this.player.y - Math.random() * 40,
          Math.random() > 0.5 ? '#facc15' : '#fbbf24',
          (Math.random() - 0.5) * 2,
          -Math.random() * 3 - 2,
          true
        ));
      }
      
      if (this.victoryAnimTimer === 150 || this.victoryAnimTimer === 100) {
        this.player.vy = -6;
        this.player.scaleX = 0.8;
        this.player.scaleY = 1.2;
        audio.playJump();
      }
      
      return;
    }

    if (this.gameWon) {
      this.player.update(input, this);
      this.handlePhysics(this.player);
      
      for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].update();
        if (this.particles[i].life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        this.floatingTexts[i].update();
        if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
      }
      
      // Spawn some celebratory particles occasionally
      if (this.frameCount % 20 === 0) {
        this.particles.push(new Particle(
          this.player.x + this.player.w / 2 + (Math.random() - 0.5) * 400,
          this.player.y - 200 - Math.random() * 100,
          Math.random() > 0.5 ? '#facc15' : '#fbbf24',
          (Math.random() - 0.5) * 2,
          -Math.random() * 3 - 2,
          true
        ));
      }

      if (input.isJustPressed('Space') || input.isJustPressed('Enter')) {
        this.level = 1;
        this.score = 0;
        this.player = new Player(50, 300);
        this.initLevel();
      }
      return;
    }

    if (this.gameOver) {
      if (input.isJustPressed('Space') || input.isJustPressed('Enter')) {
        this.initLevel();
      }
      return;
    }

    if (this.hitStop > 0) {
      this.hitStop--;
      if (this.screenShake > 0) {
        this.screenShake *= 0.9;
        if (this.screenShake < 0.5) this.screenShake = 0;
      }
      return; 
    }

    this.player.update(input, this);
    this.handlePhysics(this.player);
    if (this.portal) this.portal.update(this);

    for (const spike of this.spikes) {
      if (checkCollision(this.player.getRect(), spike)) {
        if (this.player.takeDamage(20, this.player.vx > 0 ? -5 : 5)) {
          this.screenShake = 10;
          this.hitStop = 5;
          for(let i=0; i<15; i++) this.particles.push(new Particle(this.player.x, this.player.y, '#991b1b', undefined, undefined, true));
        }
      }
    }

    if (this.player.y > 600 || this.player.hp <= 0) {
      this.gameOver = true;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(this);
      if (!(enemy instanceof FlyingEnemy)) {
        this.handlePhysics(enemy);
      } else {
        // Basic bounds checking for flying enemies
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
      }

      if (enemy.hp <= 0) {
        this.score += 100;
        this.screenShake = 10;
        this.hitStop = 5;
        for(let j=0; j<25; j++) this.particles.push(new Particle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#ef4444'));
        for(let j=0; j<10; j++) this.particles.push(new Particle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#991b1b', undefined, undefined, true));
        this.floatingTexts.push(new FloatingText(enemy.x, enemy.y, "+100", "#fff"));
        
        // Chance to drop items
        if (Math.random() < 0.3) {
           this.items.push(new Item(enemy.x, enemy.y, 'health'));
        } else if (Math.random() < 0.5) {
           this.items.push(new Item(enemy.x, enemy.y, 'score'));
        }

        if (enemy instanceof BossEnemy) {
          this.portal = new Portal(3750, -260);
          this.score += 1000;
          this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 40, "BOSS DEFEATED!", "#facc15"));
          for(let j=0; j<50; j++) this.particles.push(new Particle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#facc15'));
        }

        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].update(this)) {
        this.items.splice(i, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(this);
      if (this.projectiles[i].life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(this);
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update();
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (const ap of this.ambientParticles) {
      ap.update(this.width, this.height, this.cameraX, this.cameraY);
    }

    const lookAhead = this.player.facingRight ? 60 : -60;
    const targetCamX = this.player.x - this.width / 2 + lookAhead;
    const targetCamY = this.player.y - this.height / 2 - 40;
    
    this.cameraX += (targetCamX - this.cameraX) * 0.08;
    this.cameraY += (targetCamY - this.cameraY) * 0.1;

    // Optional: Add a lower bound to cameraY if you want to prevent seeing below the floor
    // if (this.cameraY > 300) this.cameraY = 300;

    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }
  }

  handlePhysics(entity: Entity) {
    entity.touchingWall = 0;

    // X Axis
    entity.x += entity.vx;
    for (const plat of this.platforms) {
      if (plat.isOneWay) continue; // Ignore X collisions for one-way platforms
      if (checkCollision(entity.getRect(), plat)) {
        if (entity.vx > 0) {
          entity.x = plat.x - entity.w;
          entity.touchingWall = 1;
        } else if (entity.vx < 0) {
          entity.x = plat.x + plat.w;
          entity.touchingWall = -1;
        }
        entity.vx = 0;
      }
    }

    // Y Axis
    entity.y += entity.vy;
    let grounded = false;
    for (const plat of this.platforms) {
      if (checkCollision(entity.getRect(), plat)) {
        if (entity.vy > 0) {
          // Falling down
          if (plat.isOneWay) {
            // Only collide if we were above it previously AND not trying to drop through
            const isPlayerDropping = entity instanceof Player && entity.droppingThrough;
            const wasAbove = entity.y - entity.vy + entity.h <= plat.y + 1; // +1 for floating point leniency
            
            if (wasAbove && !isPlayerDropping) {
              entity.y = plat.y - entity.h;
              grounded = true;
              entity.vy = 0;
            }
          } else {
            // Solid platform
            entity.y = plat.y - entity.h;
            grounded = true;
            entity.vy = 0;
          }
        } else if (entity.vy < 0 && !plat.isOneWay) {
          // Jumping up into a solid platform
          entity.y = plat.y + plat.h;
          entity.vy = 0;
        }
      }
    }

    if (entity instanceof Player) {
      entity.isGrounded = grounded;
      if (grounded) {
        entity.jumpsLeft = 2;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#020617'; // Slate 950 (Darker background)
    ctx.fillRect(0, 0, this.width, this.height);

    let camX = this.cameraX;
    let camY = this.cameraY;

    if (this.screenShake > 0) {
      camX += (Math.random() - 0.5) * this.screenShake;
      camY += (Math.random() - 0.5) * this.screenShake;
    }

    ctx.save();
    if (this.hitStop > 0) {
      const zoom = 1 + (this.hitStop / 10) * 0.05;
      ctx.translate(this.width/2, this.height/2);
      ctx.scale(zoom, zoom);
      ctx.translate(-this.width/2, -this.height/2);
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'; // Slate 900
    for(let i=0; i<20; i++) {
        const px = ((i * 180) - camX * 0.2) % (this.width + 180);
        const drawPx = px < -180 ? px + this.width + 180 : px;
        ctx.fillRect(drawPx, 0, 80, this.height);
        
        ctx.fillStyle = 'rgba(30, 41, 59, 0.4)'; // Slate 800
        ctx.fillRect(drawPx + 38, 0, 4, this.height);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    }

    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)'; // Slate 950 overlay
    ctx.fillRect(0, 0, this.width, this.height);

    for (const ap of this.ambientParticles) {
      ap.draw(ctx, camX, camY);
    }

    for (const p of this.particles) {
      if (p.isBlood && p.stopped) p.draw(ctx, camX, camY);
    }

    if (this.portal) {
      this.portal.draw(ctx, camX, camY);
    }

    for (const plat of this.platforms) {
      plat.draw(ctx, camX, camY);
    }
    
    for (const spike of this.spikes) {
      spike.draw(ctx, camX, camY);
    }

    for (const item of this.items) {
      item.draw(ctx, camX, camY);
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    for (const enemy of this.enemies) {
      enemy.draw(ctx, camX, camY);
    }
    
    for (const proj of this.projectiles) {
      proj.draw(ctx, camX, camY);
    }

    if (!this.gameOver) {
      this.player.draw(ctx, camX, camY);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    for (const p of this.particles) {
      if (!p.stopped) p.draw(ctx, camX, camY);
    }

    for (const ft of this.floatingTexts) {
      ft.draw(ctx, camX, camY);
    }

    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(`SCORE: ${this.score}`, 10, 20);
    ctx.fillText(`LEVEL: ${this.level}`, 10, 55);

    // Combo UI
    if (this.player.hitTimer > 0 && this.player.hitCount > 1) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(`${this.player.hitCount} HIT COMBO!`, 10, 75);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(10, 30, 120, 10);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(10, 30, 120 * Math.max(0, this.player.hp / this.player.maxHp), 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 30, 120, 10);

    if (this.hitStop > 0 && this.hitStop % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 30px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU DIED', this.width / 2, this.height / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('Press SPACE to Restart', this.width / 2, this.height / 2 + 20);
      ctx.textAlign = 'left';
    } else if (this.gameWon) {
      // Draw victory text in the game world, relative to the camera
      const victoryX = this.width / 2;
      const victoryY = this.height / 2 - 50;
      
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 10;
      
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 40px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORY!', victoryX, victoryY);
      
      ctx.fillStyle = '#fff';
      ctx.font = '20px "JetBrains Mono", monospace';
      ctx.fillText(`Final Score: ${this.score}`, victoryX, victoryY + 40);
      
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText('Press SPACE to Play Again', victoryX, victoryY + 80);
      
      ctx.textAlign = 'left';
      ctx.shadowBlur = 0;
    }
  }
}
