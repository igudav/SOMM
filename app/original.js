var	canvas,
	ctx,
	ctxWidth,
	ctxHeight,
	gSystemTime = 0,
	mViewPos = new vec2(0,0),
	mViewR = 0,
	mViewS = 1,
	mMapNodes = [],
	mRouteNodes = [],
	mSrcNode,
	mDstNode,
	mDotNode,	//which node we're on now
	mDotFrom,	//where we came from (neighbor idx)
	mDotTo,		//where we're going (neighbor idx)
	mDotI,		//i between from-to
	mDotPos = new vec2(0,0),	//render position of dot
	mDotAng = 0,
	mDotAngPID = new PID(0.16,0.1,0),
	mDotPosxPID = new PID(0.16,0.1,0),
	mDotPosyPID = new PID(0.16,0.1,0),
	mMoving = false,
	mMenu = true,
	mAtStart = true,
	mCenterView = true,
	mShowCompass = false,
	mLastTime=0,
	mFullscreen=true;

function FRAND()		{ return Math.random(); }
function RandRange(a,b)		{ return FRAND() * (b-a) + a; }
function RandRangeI(a,b)	{ return Math.floor(FRAND()*(b-a+1)) + a; }
function Interpolate(a, b, i)	{ return a + (b-a) * i; }
// Here was (x<a ? a : (x>b?b:x)), but I changed
function Clamp(x,a,b)		{ return (x<a ? a : (x>b?b:x)); }

function Create2DArray(size)
{
	var ret = [];
	for(var a=0; a<size; a++)
		ret[a] = [];
	return ret;
}
function Set2DArray(array,val)
{
	for(var x=0; x<array.length; x++)
		for(var y=0; y<array.length; y++)
			array[x][y] = val;
}

function vec2(aX,aY)
{
	this.x = aX;
	this.y = aY;
}
vec2.prototype.copy = function()		{ return new vec2(this.x,this.y); }
vec2.prototype.plusEquals = function(v)		{ this.x+=v.x; this.y+=v.y; return this; }
vec2.prototype.multiplyEquals = function(f)	{ this.x*=f; this.y*=f; return this; }
vec2.prototype.divideEquals = function(f)	{ this.x/=f; this.y/=f; return this; }
vec2.prototype.length = function()		{ return Math.sqrt(this.x*this.x+this.y*this.y); }
vec2.prototype.lengthSquared = function()	{ return this.x*this.x+this.y*this.y; }
vec2.divide = function(a,f)			{ return new vec2(a.x/f,a.y/f); }
vec2.add = function(a,b)			{ return new vec2(a.x+b.x, a.y+b.y); }
vec2.sub = function(a,b)			{ return new vec2(a.x-b.x, a.y-b.y); }
vec2.interpolate = function(a,b,i)		{ return new vec2(Interpolate(a.x,b.x,i), Interpolate(a.y,b.y,i)); }
vec2.bezier = function(p1,p2,p3,p4,i) 
{
	var a = (1-i)*(1-i)*(1-i);
	var b = 3*(1-i)*(1-i)*i;
	var c = 3*(1-i)*i*i;
	var d = i*i*i;
	return new vec2(a*p1.x + b*p2.x + c*p3.x + d*p4.x, a*p1.y + b*p2.y + c*p3.y + d*p4.y);
}

function PID(aKp,aKi,aKd)
{
	this.Kp = aKp;		//pid constants
	this.Ki = aKi;
	this.Kd = aKd;
	this.CV = 0;		//control value.  output.
	this.I = 0;		//Integral
	this.e1 = 0;		//previous error
	this.Reset = function()		{ this.CV=0; this.I=0; this.e1=0; }
	this.GetValue = function()	{ return this.CV; }
	this.Step = function(aDt,aError) {
		var e0 = aError;
		var P = this.Kp * e0;
		this.I = this.I + this.Ki * e0 * aDt;
		var D = this.Kd * (e0 - this.e1) / aDt;
		this.CV = P + this.I + D;
		this.e1 = e0;
	}
}

function DrawArrow(ctx,x,y,ang)
{
	ctx.save();
	ctx.translate(x,y);
	ctx.rotate(ang);
	var s = 3;
	var ci = (Math.sin(gSystemTime*5)*0.1+0.9);
	ctx.fillStyle = 'rgb(' + Math.floor(255*ci) + ',' + Math.floor(128*ci) + ',0)';
	ctx.beginPath();
	ctx.moveTo(0,-s); ctx.lineTo(-s*0.3,-s); ctx.lineTo(-s*0.2,0); ctx.lineTo(-s*0.7,0);	
	ctx.lineTo(0,s); ctx.lineTo(s*0.7,0); ctx.lineTo(s*0.2,0); ctx.lineTo(s*0.3,-s); ctx.lineTo(0,-s);
	ctx.fill();
	ctx.strokeStyle = "rgb(0,0,0)";
	ctx.lineWidth = 0.25;
	ctx.beginPath();
	ctx.moveTo(0,-s); ctx.lineTo(-s*0.3,-s); ctx.lineTo(-s*0.2,0); ctx.lineTo(-s*0.7,0);	
	ctx.lineTo(0,s); ctx.lineTo(s*0.7,0); ctx.lineTo(s*0.2,0); ctx.lineTo(s*0.3,-s); ctx.lineTo(0,-s);
	ctx.stroke();
	ctx.restore();
}

function DrawControl(ctx,x,y,ang)
{
	ctx.save();
	ctx.translate(x,y);
	ctx.rotate(ang);
	var s = 2;

	ctx.fillStyle = "white";
	ctx.fillRect(-s,-s,s*2,s*2);

	ctx.fillStyle = "rgb(255,128,0)";
	ctx.beginPath();
	ctx.moveTo(s,s);
	ctx.lineTo(-s,s);
	ctx.lineTo(s,-s);
	ctx.lineTo(s,s);
	ctx.fill();

	ctx.strokeStyle = "black";
	ctx.lineWidth = 0.25;
	ctx.strokeRect(-s,-s,s*2,s*2);

	ctx.restore();
}


function MapNode(aPos)
{
	this.pos = aPos.copy();	//vec2
	this.neighbors = [];	//[4] references to neighbor MapNodes
	this.neighborCnt = 0;
	this.center;		//average position of pos and neighbors[].pos
	this.startNeighbor = RandRangeI(-5,5);

	this.GetValidNeighborIdx = function(neighborNum)
	{
		var can = neighborNum;
		var ca = -1;
		while(can > 0) {
			if(++ca >= 4)		ca = 0;
			if(this.neighbors[ca])	can--;
		}
		return ca;
	}

	this.GetNeighborPos = function(neighborIdx,i) 
	{
		return vec2.interpolate(this.center, this.neighbors[neighborIdx].center, i);
	}

	this.UpdateDotPos = function()
	{
		//calc dotpos
		var p1 = this.GetNeighborPos(mDotFrom, 0.5);
		var p2 = this.GetNeighborPos(mDotTo, 0.5);
		var c1 = vec2.interpolate(p1,this.center,0.7);
		var c2 = vec2.interpolate(p2,this.center,0.7);
		mDotPos = vec2.bezier(p1,c1,c2,p2,mDotI);
		var dir = vec2.sub(vec2.bezier(p1,c1,c2,p2,mDotI+0.001), mDotPos);
		mDotAng = Math.atan2(dir.x,dir.y) + Math.PI;
	}

	this.Draw = function(ctx)
	{
		//if far from the view position, don't draw:
		var minD = Math.max(ctxWidth,ctxHeight)*1.2/mViewS;
		var dist =	(this.center.x-mViewPos.x)*(this.center.x-mViewPos.x) + 
				(this.center.y-mViewPos.y)*(this.center.y-mViewPos.y);
		if(dist > minD*minD)
			return;

		//draw lines to neighbors:
		if(this.startNeighbor <= 0)
		{
			//connect the averaged center to the real midpoints:
			for(var a=0; a<4; a++)
				if(this.neighbors[a])
				{
					var cent = this.GetNeighborPos(a,-0.02);
					ctx.moveTo(cent.x,cent.y);
					var half = this.GetNeighborPos(a, mMenu ? 0.43 : 0.5);
					ctx.lineTo(half.x,half.y);
				}
		}
		else 
		{
			//bezier from the start neighbor to all the rest:
			var ca = this.GetValidNeighborIdx(this.startNeighbor);
			var centerHalf = this.GetNeighborPos(ca, mMenu ? 0.43 : 0.5);
			for(var a=0; a<4; a++)
				if(a!=ca && this.neighbors[a])
				{
					ctx.moveTo(centerHalf.x,centerHalf.y);
					var half = this.GetNeighborPos(a, mMenu ? 0.43 : 0.5);
					var c1 = vec2.interpolate(centerHalf,this.center,0.7);
					var c2 = vec2.interpolate(half,this.center,0.7);
					ctx.bezierCurveTo(c1.x,c1.y, c2.x,c2.y, half.x,half.y);
				}
		}
	}

	this.DrawArrows = function(ctx)
	{
		for(var a=0; a<4; a++)
			if(this.neighbors[a])
			{
				var half = this.GetNeighborPos(a, 0.4);
				var dir = vec2.sub(this.center, half);
				var ang = Math.atan2(dir.x,-dir.y);
				DrawArrow(ctx, half.x, half.y, ang);
			}
	}

	this.ClickArrows = function(aPos)
	{
		//only do this if we're stopped:
		if(mMoving == true)
			return;
		//is the click near any of the arrows?
		for(var a=0; a<4; a++)
			if(this.neighbors[a])
			{
				var half = this.GetNeighborPos(a, 0.4);
				if(vec2.sub(half,aPos).length() < 3)
				{
					//clicked it!
					mDotTo = a;
					mMoving = true;
					mAtStart = false;
					mCenterView = false;
					//if we're doing a u-turn, we're basically already done:
					if(a==mDotFrom && mDotI<0.1)
						mDotI = 0.999;
					return;
				}
			}		
	}
}

function RouteNode(aNode,aFrom,aTo)
{
	this.mNode = aNode;
	this.mFrom = aFrom;
	this.mTo = aTo;
	this.Draw = function(ctx)
	{
		//if far from the view position, don't draw:
		var minD = Math.max(ctxWidth,ctxHeight)*1.2/mViewS;
		if(vec2.sub(this.mNode.center,mViewPos).lengthSquared() > minD*minD)
			return;
		//bezier from the src neighbor to the dst: 
		var srcHalf = this.mNode.GetNeighborPos(this.mFrom, 0.5);
		var dstHalf = this.mNode.GetNeighborPos(this.mTo, 0.5);
		ctx.moveTo(srcHalf.x,srcHalf.y);
		var c1 = vec2.interpolate(srcHalf,this.mNode.center,0.7);
		var c2 = vec2.interpolate(dstHalf,this.mNode.center,0.7);
		ctx.bezierCurveTo(c1.x,c1.y, c2.x,c2.y, dstHalf.x,dstHalf.y);		
	}
}


function BuildMap()
{
	mMapNodes.length = 0;

	var GRID = 20;
	var SCALE = 20;

    // O----------> x
    // |
    // |
    // |
    // |
    // V
    // y
	//1=up 2=dn 4=lf 8=rt
	var dx = [ 0, 0,-1, 1 ];
	var dy = [-1, 1, 0, 0 ];
	var nodes = Create2DArray(GRID); //[GRID][GRID];
	//set all:
	Set2DArray(nodes,15);
	//unset edges:
	for(var a=0; a<GRID; a++) {
		nodes[a][0] &= ~1;
		nodes[a][GRID-1] &= ~2;
		nodes[0][a] &= ~4;
		nodes[GRID-1][a] &= ~8;
	}

	//randomly turn off some nodes on the grid:
	var NODESSPARSENESS = 0.6
	for(var s=2; s<6; s++)
		for(var x=0; x<GRID; x+=s)
			for(var y=0; y<GRID; y+=s)
				if(FRAND()<NODESSPARSENESS)
					for(var a=0; a<4; a++)
						if(nodes[x][y] & (1<<a))
						{
							nodes[x][y] &= ~(1<<a);
							nodes[x+dx[a]][y+dy[a]] &= ~(1<<(a^1));
						}

	//go through each one and randomly turn off a few edges:
	var MAPCONNECTIVITY = 0.09;
	for(var x=0; x<GRID; x++)
		for(var y=0; y<GRID; y++)
			for(var a=0; a<4; a++)
				if(nodes[x][y] & (1<<a))
					if(FRAND()<MAPCONNECTIVITY)
					{
						nodes[x][y] &= ~(1<<a);
						nodes[x+dx[a]][y+dy[a]] &= ~(1<<(a^1));
					}

	//remove any nodes that only have have one neighbor:
	var busy = true;
	while(busy)
	{
		busy = false;
		for(var x=0; x<GRID; x++)
			for(var y=0; y<GRID; y++)
			{
				//count neighbors:
				var cnt = 0;
				for(var a=0; a<4; a++)
					if(nodes[x][y] & (1<<a))
						cnt++;
				if(cnt == 1)
				{
					//remove it:
					for(var a=0; a<4; a++)
						if(nodes[x][y] & (1<<a))
						{
							nodes[x][y] &= ~(1<<a);
							nodes[x+dx[a]][y+dy[a]] &= ~(1<<(a^1));
						}
					//loop again:
					busy = true;
				}
			}
	}

	//make sure the whole network is connected, find the first valid node
	//and floodfill from there, throw out anything not marked:
	var mark = Create2DArray(GRID);//[GRID][GRID];
	var startNode = 1;
	while(startNode)
	{
		Set2DArray(mark,false);
		
		//find the start node:
		var sn = startNode;
		for(var x=0; x<GRID; x++)
			for(var y=0; y<GRID; y++)
				if(nodes[x][y])
					if(--sn == 0)
						{ mark[x][y] = true; x=GRID; y=GRID; }
		//floodfill:
		busy = true;
		while(busy)
		{
			busy = false;
			for(var x=0; x<GRID; x++)
				for(var y=0; y<GRID; y++)
					if(mark[x][y])
						for(var a=0; a<4; a++)
							if(nodes[x][y] & (1<<a))
								if(!mark[x+dx[a]][y+dy[a]]) {
									mark[x+dx[a]][y+dy[a]] = true;
									busy = true;
								}
		}
		//make sure we didn't remove too much:
		var cnt = 0;
		for(var x=0; x<GRID; x++)
			for(var y=0; y<GRID; y++)
				if(mark[x][y])
					cnt++;
		if(cnt > GRID*GRID/16)
			break;
		startNode++;
	}
	//remove anything thats not marked:
	for(var x=0; x<GRID; x++)
		for(var y=0; y<GRID; y++)
			if(!mark[x][y])
				for(var a=0; a<4; a++)
					if(nodes[x][y] & (1<<a))
					{
						nodes[x][y] &= ~(1<<a);
						nodes[x+dx[a]][y+dy[a]] &= ~(1<<(a^1));
					}


	//move around the points:
	var RND = 0.4;
	var xy = Create2DArray(GRID);  //[GRID][GRID];
	for(var x=0; x<GRID; x++)
		for(var y=0; y<GRID; y++)
			xy[x][y] = new vec2(x+RandRange(-RND,RND), y+RandRange(-RND,RND));

	//spiral the points around a center point:
	for(var xx=0; xx<=GRID; xx+=15)
		for(var yy=0; yy<=GRID; yy+=15)
		{
			var center = new vec2(xx,yy);
			var RAD = RandRange(6,8);
			var ang = RandRange(0.7,1.2) * (FRAND()>0.5 ? 1 : -1);
			for(var x=0; x<GRID; x++)
				for(var y=0; y<GRID; y++)
				{
					var p = vec2.sub(xy[x][y], center);
					var d = p.length() / RAD;
					var a = Interpolate(ang,0,Clamp(d,0.5,1.));
					var o = new vec2(Math.cos(a) * p.x - Math.sin(a) * p.y,
							 Math.sin(a) * p.x + Math.cos(a) * p.y);
					xy[x][y] = vec2.add(o,center);
				}
		}

	//build map nodes:
	var mapNodes = Create2DArray(GRID);
	for(var x=0; x<GRID; x++)
		for(var y=0; y<GRID; y++)
			if(nodes[x][y])
				mapNodes[x][y] = new MapNode(xy[x][y].copy().multiplyEquals(SCALE));
	//assign neighbors references:
	for(var x=0; x<GRID; x++)
		for(var y=0; y<GRID; y++)
			for(var a=0; a<4; a++)
				if(nodes[x][y] & (1<<a))
					mapNodes[x][y].neighbors[a] = mapNodes[x+dx[a]][y+dy[a]];
	//calc center position, copy the valid mapNodes into mMapNodes
	for(var x=0; x<GRID; x++)
		for(var y=0; y<GRID; y++)
			if(mapNodes[x][y])
			{
				//move the node center to the average of the neighbors:
				mapNodes[x][y].center = mapNodes[x][y].pos.copy();
				var cnt = 1;
				for(var a=0; a<4; a++)
					if(mapNodes[x][y].neighbors[a]) {
						var half = vec2.interpolate(mapNodes[x][y].pos,
									    mapNodes[x][y].neighbors[a].pos, 0.5);
						mapNodes[x][y].center.plusEquals(half);
						cnt++;
					}
				mapNodes[x][y].center.divideEquals(cnt);
				mapNodes[x][y].neighborCnt = cnt-1;
				
				//if there's only two neighbors, and its set for straight line rendering, change it:
				if(mapNodes[x][y].neighborCnt==2 && mapNodes[x][y].startNeighbor<=0)
					mapNodes[x][y].startNeighbor = 1;

				//add to list:
				mMapNodes.push(mapNodes[x][y]);
			}
}

function InitCourse()
{
	//pick a random start node, put the dot there:
	mSrcNode = mMapNodes[RandRangeI(0,mMapNodes.length - 1)];

	//pick a random end node, make sure its far from the start node:
	var dist = 0;
	while(dist < 50) {
		mDstNode = mMapNodes[RandRangeI(0,mMapNodes.length-1)];
		dist = vec2.sub(mSrcNode.center,mDstNode.center).length();
	}
	InitDot();
}

function InitDot()
{
	mRouteNodes.length = 0;

	mDotNode = mSrcNode;
	mDotFrom = mDotNode.GetValidNeighborIdx(RandRangeI(1,4));
	mDotTo = mDotFrom;
	while(mDotTo == mDotFrom)
		mDotTo = mDotNode.GetValidNeighborIdx(RandRangeI(1,4));
	mDotI = 0.5;
	mDotNode.UpdateDotPos();
	mAtStart = true;
	mCenterView = true;
}

function MoveViewToDot()
{
	mDotNode.UpdateDotPos();
	mViewPos = mDotPos.copy();
	mDotPosxPID.Reset();
	mDotPosyPID.Reset();
	mDotAngPID.Reset();
}

function Update(aDt)
{
	gSystemTime += aDt;

	if(mMenu)
	{
		mViewPos.x = 200;
		mViewPos.y = 350;
		mViewS = 1 * Math.min(ctxWidth,ctxHeight) / 600;
		mViewR = 0;
	}
	else
	{
		//step the dot forward until we've gone far enough:
		var dist = 0;
		while(mMoving && dist<aDt*35)
		{
			var lastDP = mDotPos.copy();
			mDotI += 0.05;
			while(mDotI > 1)
			{
				//add a node to the route history:
				mRouteNodes.push(new RouteNode(mDotNode,mDotFrom,mDotTo));

				//move to the next node:
				mDotNode = mDotNode.neighbors[mDotTo];
				mDotFrom = mDotTo ^ 1;
				mDotTo = mDotFrom;
				while(mDotTo == mDotFrom)
					mDotTo = mDotNode.GetValidNeighborIdx(RandRangeI(1,4));
				mDotI -= 1;

				//if the new dotNode has more than two neighbors, stop.  but not if its the dest:
				if(mDotNode.neighborCnt>2 && mDotNode!=mDstNode)
					mMoving = false;
			}
			mDotNode.UpdateDotPos();
			dist += vec2.sub(mDotPos,lastDP).length();
		}
	
		//update view pos:
		mViewS = 17 * Math.min(ctxWidth,ctxHeight) / 600;
		if(mDotAng - mViewR > Math.PI)	mViewR += Math.PI*2;
		if(mViewR - mDotAng > Math.PI)	mViewR -= Math.PI*2;
		mDotAngPID.Step(aDt,mDotAng-mViewR);		mViewR += mDotAngPID.GetValue();
		mDotPosxPID.Step(aDt,mDotPos.x-mViewPos.x);	mViewPos.x += mDotPosxPID.GetValue();
		mDotPosyPID.Step(aDt,mDotPos.y-mViewPos.y);	mViewPos.y += mDotPosyPID.GetValue();

//		mViewPos.x = mDotPos.x;
//		mViewPos.y = mDotPos.y;
//		mViewR = mDotAng;

		//at the finish?
		if(mDotNode==mDstNode && mDotI>0.5) {
			MenuStop();
			document.getElementById('menuRestart').style.display = "inline";
			document.getElementById('menuContinue').style.display = "none";
			Update(0.01);
		}

	}
}

function MouseDown(aX,aY)
{
	//convert client position into world position:
	var x = ((aX - canvas.offsetLeft) - ctxWidth*0.5) / mViewS;
	var y = ((aY - canvas.offsetTop) - ctxHeight*(mCenterView?0.5:0.8)) / mViewS;	
	var _x = Math.cos(-mViewR) * x - Math.sin(-mViewR) * y;
	var _y = Math.sin(-mViewR) * x + Math.cos(-mViewR) * y;
	mDotNode.ClickArrows(new vec2(_x+mViewPos.x,_y+mViewPos.y));
}
function CanvasMouseDown(e)
{
	MouseDown(e.clientX,e.clientY);
}
function CanvasTouchDown(e)
{
	e.preventDefault();
	MouseDown(e.targetTouches[0].pageX,e.targetTouches[0].pageY);
}

function DrawMap()
{
	ctx.save();
	ctx.translate(ctxWidth*0.5,ctxHeight*((mCenterView&&!mMenu)?0.5:0.8));
	ctx.scale(mViewS,mViewS);
	ctx.rotate(mViewR);
	ctx.translate(-mViewPos.x,-mViewPos.y);
	

	//draw route:
	if(mMenu)
	{
		ctx.strokeStyle = "rgb(255,100,100)";
		ctx.lineWidth = 8;
		ctx.beginPath();
		for(var a=0; a<mRouteNodes.length; a++)
			mRouteNodes[a].Draw(ctx);	
		ctx.stroke();
	}

	//draw trails:
	ctx.strokeStyle = mMenu ? "rgb(0,150,0)" : "rgb(255,255,255)";
	ctx.lineWidth = 3;
	ctx.beginPath();
	for(var a=0; a<mMapNodes.length; a++)
		mMapNodes[a].Draw(ctx);	
	ctx.stroke();


	//draw course:
	if(mMenu)
	{
		ctx.strokeStyle = "rgba(255,0,255,0.5)";
		ctx.lineWidth = 5;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		var rad = 15;
		ctx.arc(mDstNode.center.x,mDstNode.center.y, rad, 0,Math.PI*2, false);
		var dir = vec2.sub(mDstNode.center,mSrcNode.center);
		dir.divideEquals(dir.length());
		ctx.moveTo(mSrcNode.center.x+dir.x*rad,mSrcNode.center.y+dir.y*rad);
		ctx.lineTo(mSrcNode.center.x-dir.x*rad*0.6+dir.y*rad*0.9,mSrcNode.center.y-dir.y*rad*0.6-dir.x*rad*0.9);
		ctx.lineTo(mSrcNode.center.x-dir.x*rad*0.6-dir.y*rad*0.9,mSrcNode.center.y-dir.y*rad*0.6+dir.x*rad*0.9);
		ctx.lineTo(mSrcNode.center.x+dir.x*rad,mSrcNode.center.y+dir.y*rad);
		ctx.lineTo(mDstNode.center.x-dir.x*rad,mDstNode.center.y-dir.y*rad);
		ctx.stroke();
		ctx.lineJoin = 'miter';
	}
	//draw start/end controls
	if(!mMenu)
	{
		DrawControl(ctx,mSrcNode.center.x,mSrcNode.center.y,-mViewR);		
		DrawControl(ctx,mDstNode.center.x,mDstNode.center.y,-mViewR);		
	}
	
	//draw dot:
	if(!mAtStart)
	{
		var rad = mMenu ? 5 : 2;
		ctx.fillStyle = "rgb(128,0,0)";
		ctx.beginPath();
		ctx.arc(mDotPos.x,mDotPos.y, rad, 0,Math.PI*2, false);
		ctx.fill();
		ctx.strokeStyle = "rgb(0,0,0)";
		ctx.lineWidth = mMenu ? 1 : 0.25;
		ctx.beginPath();
		ctx.arc(mDotPos.x,mDotPos.y, rad, 0,Math.PI*2, false);
		ctx.stroke();
	}


	//draw choice arrows:
	if(!mMoving && !mMenu)
		mDotNode.DrawArrows(ctx);
	
	ctx.restore();

	//draw compass:
	if(mShowCompass)
	{
		var s = Math.min(40,Math.min(ctxWidth,ctxHeight)/15);

		ctx.save();
		ctx.translate(s*1.2,ctxHeight-s*1.2);
		ctx.rotate(mViewR);


		ctx.fillStyle = "rgba(0,0,0,0.1)";
		ctx.beginPath();
		ctx.arc(0,0,s,0,Math.PI*2,false);
		ctx.fill();
		ctx.strokeStyle = "black";
		ctx.lineWidth = s<30 ? 1 : 2;
		ctx.beginPath();
		ctx.arc(0,0,s,0,Math.PI*2,false);
		ctx.stroke();
		
		ctx.fillStyle = "red";
		ctx.beginPath();
		ctx.moveTo(-s*0.15,0);
		ctx.lineTo(-s*0.15,-s*0.8);
		ctx.lineTo(0,-s);
		ctx.lineTo(s*0.15,-s*0.8);
		ctx.lineTo(s*0.15,0);
		ctx.fill();
		
		ctx.fillStyle = "white";
		ctx.beginPath();
		ctx.moveTo(-s*0.15,0);
		ctx.lineTo(-s*0.15,s*0.8);
		ctx.lineTo(0,s);
		ctx.lineTo(s*0.15,s*0.8);
		ctx.lineTo(s*0.15,0);
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(-s*0.15,0);
		ctx.lineTo(-s*0.15,-s*0.8);
		ctx.lineTo(0,-s);
		ctx.lineTo(s*0.15,-s*0.8);
		ctx.lineTo(s*0.15,s*0.8);
		ctx.lineTo(0,s);
		ctx.lineTo(-s*0.15,s*0.8);
		ctx.lineTo(-s*0.15,0);
		ctx.stroke();		

		ctx.restore();
	}
}

function MenuNewMap()
{
	BuildMap();
	MenuNewLeg();
}
function MenuNewLeg()
{
	InitCourse();
	document.getElementById('menuGo').style.display = "inline";
	document.getElementById('menuContinue').style.display = "none";
	document.getElementById('menuRestart').style.display = "none";
}
function MenuGo()
{
	MoveViewToDot();
	mViewR = mDotAng = 0;
	SetMenuVis(false);
	document.getElementById('menuNewMap').style.display = "none";
	document.getElementById('menuNewLeg').style.display = "none";
	document.getElementById('menuGo').style.display = "none";
	document.getElementById('menuContinue').style.display = "none";
	document.getElementById('menuRestart').style.display = "inline";
	document.getElementById('menuStop').style.display = "inline";
}
function MenuContinue()
{
	MenuGo();
}
function MenuRestart()
{
	InitDot();
	MenuGo();
}
function MenuStop()
{
	SetMenuVis(true);
	mMoving = false;
	mCenterView = true;
	document.getElementById('menuNewMap').style.display = "inline";
	document.getElementById('menuNewLeg').style.display = "inline";
	document.getElementById('menuContinue').style.display = "inline";
	document.getElementById('menuRestart').style.display = (ctxWidth<500) ? "none" : "inline";
	document.getElementById('menuStop').style.display = "none";
}
function MenuCompass()
{
	mShowCompass = !mShowCompass;
}

function SmallButtons()
{
	document.getElementById('menuNewMap').style.fontSize = "10px";
	document.getElementById('menuNewLeg').style.fontSize = "10px";
	document.getElementById('menuGo').style.fontSize = "10px";
	document.getElementById('menuRestart').style.fontSize = "10px";
	document.getElementById('menuContinue').style.fontSize = "10px";
	document.getElementById('menuStop').style.fontSize = "10px";
	document.getElementById('fullscreen').style.display = "none";
}

function GetYPos(obj) 
{
	var obj2 = obj;
	var y = 0;
 		do  {
			y += obj.offsetTop-obj.scrollTop;
			obj = obj.offsetParent;
			obj2 = obj2.parentNode;
			while (obj2!=obj) {
				y -= obj2.scrollTop;
				obj2 = obj2.parentNode;
			}
		} while (obj.offsetParent)
	return y;
}

function WindowResize()
{
	//get canvas y:
	var y = GetYPos(canvas);

	//get window inner size:
	var winW = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth;
	var winH = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight;

	canvas.width = ctxWidth = Math.min(mFullscreen ? 3000 : 600,winW);
	canvas.height = ctxHeight = Math.min(mFullscreen ? 3000 : 600,winH-y);
}

function init() 
{
	canvas = document.getElementById('canvas');
	WindowResize();
	if(Math.min(ctxWidth,ctxHeight) < 500)
		SmallButtons();
	WindowResize();

	ctx = canvas.getContext('2d');
	setInterval(gameLoop, 1000/60);
	//split for IE:
	if(canvas.addEventListener)	canvas.addEventListener('mousedown', CanvasMouseDown, false);
	else if(canvas.attachEvent)	canvas.attachEvent('onmousedown', CanvasMouseDown);
	if(canvas.addEventListener)	canvas.addEventListener('touchstart', CanvasTouchDown, false);
	else if(canvas.attachEvent)	canvas.attachEvent('ontouchstart', CanvasTouchDown);
	if(window.addEventListener)	window.addEventListener('resize', WindowResize, false);
	else if(window.attachEvent)	window.attachEvent('resize', WindowResize);

	BuildMap();
	InitCourse();
}

function SetMenuVis(menu)
{
	mMenu = menu;
	canvas.style.background = mMenu ? "white" : "rgb(200,200,255)";
}

function gameLoop() 
{
	var t = new Date().getTime();
	var dt = (t - mLastTime) / 1000;
	mLastTime = t;
	
	//clear canvas:
	ctx.clearRect(0,0,ctxWidth,ctxHeight);

	Update(dt);
	DrawMap();

//	ctx.fillStyle = "black";
//	ctx.font = "10pt arial";
//	ctx.fillText(Math.round(1/dt) + "",10,10);
}

window.onload = init;