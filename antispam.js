(function() {
	Debug = false;
	spamData = new Object();
	antiSpam = 3000;
	antiSpamRemove = 3;
	removeKickCountAfter = 1;
	maxSpam = 12;
	spamEnableTempBan = true;
	spamKicksBeforeTempBan = 3;
	spamTempBanInMinutes = 10;
	
	var antiSpam = function(set) {
		antiSpam = set["spamCheckInterval"];
		antiSpamRemove = set["spamMinusPointsPerInterval"];
		maxSpam = set["spamMaxPointsBeforeKick"] + (antiSpam/1000);
		spamEnableTempBan = set["spamEnableTempBan"];
		spamKicksBeforeTempBan = set["spamKicksBeforeTempBan"];
		spamTempBanInMinutes = set["spamTempBanInMinutes"]*60000;
		removeKickCountAfter = set["removeKickCountAfter"]*60000;
		Debug = set["debug"];
	}

	antiSpam.prototype.addSpam = function(socket){
		if(socket.spamViolated) return;
		spamData[socket.ip].spamScore+=1;
		console.log(spamData[socket.ip]);
		this.maxSpamCheck(socket);
	}
	
	antiSpam.prototype.getSpamScore = function(socket){
		if(spamData[socket.ip]!=undefined) return spamData[socket.ip].spamScore;
	}
	
	antiSpam.prototype.onConnect = function(socket){
		this.authenticate(socket);
		var dat = this;
		var emit = socket.emit;
		socket.emit = function() {
			dat.addSpam(socket);
			emit.apply(socket, arguments);
		};

		var dat = this;
		var $emit = socket.$emit;
		socket.$emit = function() {
			dat.addSpam(socket);
			$emit.apply(socket, arguments);
		};
		if(typeof(spamCheckInterval)=="undefined") spamCheckInterval = setInterval(this.checkSpam,antiSpam);
		if(typeof(spamKickCountInterval)=="undefined") spamKickCountInterval = setInterval(this.removeKickCount, removeKickCountAfter);
	}
	antiSpam.prototype.removeKickCount = function(){
		for(user in spamData){
			if(spamData[user].kickCount>=1) {
				if(Debug) console.log("[ " + user + " ] is lowering his kickcount with 1, current kickcount: "+spamData[user].kickCount);
				spamData[user].kickCount--; 
			}
		}
	}
	
	antiSpam.prototype.maxSpamCheck = function(socket){
		if(spamData[socket.ip].spamScore>=maxSpam && !socket.spamViolated){
		if(spamData[socket.ip].banned) return;
		  socket.spamViolated = true;
		  spamData[socket.ip].kickCount++;
		  if(spamData[socket.ip].kickCount>=spamKicksBeforeTempBan && spamEnableTempBan){
				if(Debug) console.log("[ "+socket.id + " / "+socket.ip+" ] temp banned.");
				spamData[socket.ip].banned = true;
				spamData[socket.ip].timeout = setTimeout(function(socket){
					spamData[socket.ip] = {
						spamScore: 0,
						kickCount: 0,
						banned: false,
						timeout: 0
					}
				}, spamTempBanInMinutes, socket);
		  }
		  socket.disconnect();
	   }
	}
	
	antiSpam.prototype.checkSpam = function(){
		for(user in spamData){
			if(spamData[user].spamScore>=1) spamData[user].spamScore-=antiSpamRemove;
		}
		return;
	}
	
	antiSpam.prototype.authenticate = function(socket){
		socket.spamViolated = false;
		var address = socket.handshake.address;
		socket.ip = address.address;
		
		if(typeof(spamData[socket.ip])=="undefined"){
			spamData[socket.ip] = {
				spamScore: 0,
				kickCount: 0,
				banned: false,
				timeout: 0
			}
			return;
		}
		if(spamData[socket.ip].banned){
			if(Debug){
				timeout = spamData[socket.ip].timeout;
				left = Math.ceil((timeout._idleStart + timeout._idleTimeout - Date.now()) / 1000);
				console.log("[ "+socket.id + " / "+socket.ip+" ] is still banned for "+left+" seconds");
			}
			socket.disconnect();
		}
		spamData[address.address].spamScore = 0;
	}

	Array.prototype.contains = function(k) {
		for(var p in this)
		if(this[p] === k) return true;
		return false;
	};
	module.exports = antiSpam;
}).call(this);