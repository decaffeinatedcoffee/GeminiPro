

const express = require("express");
const http = require("http");
const app = new express();
const server = http.createServer(app);
require("dotenv").config();
const bodyParser = require("body-parser");
let path = require('path');
const CryptoJS = require("crypto-js");
var bcrypt = require('bcrypt');
var fetch = require("node-fetch");
var AES = require("crypto-js/aes");
const OneSignal = require('onesignal-node');  
var serveIndex = require('serve-index');
const mongoose = require('mongoose');
var cors = require('cors');
const uuid = require('uuid');
const { strict } = require("assert");
const { timeStamp } = require("console");
const io = require('socket.io')(server);
app.use(cors({
  origin: '*',
}))
app.use('/assets', express.static(__dirname + '/assets'), serveIndex(__dirname + '/assets'));
const client = new OneSignal.Client(process.env.OSID, process.env.OSKEY);
app.set('io', io);
db().catch(err => console.log(err));
async function db() {
await mongoose.connect(process.env.MONGODB);
}

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true,
      },
      password: {
        type: String,
        required: true
      },
      id: {
      type: String,
      required: true
        },
      createdAt: {
        type: String,
        required:true,
      },
      oneSignal:{
        type:Array,
      },
      loggedDevices:{
      type:Array,
      },
      devices:{
       myDevices:{
        type:Array
       },
       sharedDevices:{
        type:Array
       },
       sharingWith:{
        type:Array
       }
      }
    });


    const devicesSchema = mongoose.Schema({
      id: {
          type: String,
          required: true
        },
      name: {
          type: String,
          required: true,
        },
      connectionStatus: {
          type: String,
          required: true
        },
       status: {
        gpioStatus:{
          type:Number
        },
        lightAlarm:{
          type:Number
        },
        lightAlarmTime:{
        type:Number
        },
        ledColors:{
          current:{
            type:String
          },
          on:{
            type:String
          },
          off:{
            type:String
          }
        },
        timer:{
          timezone:{
            type:Number
          },
          on:{
            type:String
          },
          off:{
            type:String
          }
        },
          },
       lastAction: {
          type: String,
          required:true,
        },
       sincricPro:{
        appKey:{
          type: String,
        }, 
        appSecret:{
          type: String,
        },
        switchID: {
          type: String,
        }
       },
       socketID:{
        type: String,
      }
      });
    const User = mongoose.model("users", userSchema);
    const Device = mongoose.model("devices", devicesSchema);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));


app.post("/api/v1/register", async function(req,res){
let username = req.body.username;
let email = req.body.email;
let pass = req.body.pass;
bcrypt.hash(pass, 10, function(err, hash) {
  if(err){
  res.send({"error":true, "message":"Error while generating password hash."});
  return; 
  }else{
username = CryptoJS.AES.encrypt(username, process.env.SALT).toString();
var u = new User({username:username, email:email, password:hash, id: uuid.v4(), createdAt:new Date().getTime(), devices:{myDevices:[], sharedDevices:[],sharingWith:[]}});
u.save()
res.send({"error":false, "message":"User was created successfully."});
  }
})
})


app.post("/api/v1/login", async function(req,res){
let mail = req.body.email;
let pass = req.body.pass;

User.findOne({email: mail}).then(async function(user){
 if(user){
  let verifyPass = bcrypt.compareSync(pass, user.password);  
    if(verifyPass){
    loginToken = uuid.v4();
    user.loggedDevices.push(loginToken);
    user.save();
    res.send({error:false, token:loginToken, id:user.id});
    }else{
      res.send({error:true, message:"Wrong password"});
    }
 }else{
  res.send({error:true, message:"User not found"});
  return;
 }
});
});



app.post("/api/v1/logincheck", function(req,res){
 let token = req.body.token;
 let id = req.body.id;
 let oneSignal = req.body.onesignal;

 User.findOne({id: id}).then(async function(user){
  if(user){
   if(user.loggedDevices.includes(token)){
    let username = CryptoJS.AES.decrypt(user.username, process.env.SALT).toString(CryptoJS.enc.Utf8);
    let myDevices = [];
    let sharedDevices = [];
    let sharingWith = [];
    if(!user.oneSignal.includes(oneSignal) && oneSignal != null){
      user.oneSignal.push(oneSignal);
      user.save();
    }
    for(var i = 0; i < user.devices.myDevices.length; i++){
      let device = await Device.findOne({id:user.devices.myDevices[i]});
     if(device){
      device.sincricPro.appKey = CryptoJS.AES.decrypt(device.sincricPro.appKey, process.env.SALT).toString(CryptoJS.enc.Utf8);
      device.sincricPro.appSecret = CryptoJS.AES.decrypt(device.sincricPro.appSecret, process.env.SALT).toString(CryptoJS.enc.Utf8);
      device.sincricPro.switchID = CryptoJS.AES.decrypt(device.sincricPro.switchID, process.env.SALT).toString(CryptoJS.enc.Utf8);
      myDevices.push(device);
     }
    }

    for(var i = 0; i < user.devices.sharedDevices.length; i++){
      let device = await Device.findOne({id:user.devices.sharedDevices[i]});
      if(device){
        sharedDevices.push(device);
      }
     }

     for(var i = 0; i < user.devices.sharingWith.length; i++){
      let shuser = await User.findOne({id:user.devices.sharingWith[i]});
      let shusername = CryptoJS.AES.decrypt(shuser.username, process.env.SALT).toString(CryptoJS.enc.Utf8);
      sharingWith.push({username: shusername, email:shuser.email});
     }

    let userdata = {username: username, email:user.email,id:user.id, devices:{myDevices, sharedDevices, sharingWith}, createdAt:user.createdAt};


    res.send({valid:true, userData:userdata});
    
   }else{
    res.send({valid:false});
   }
  }else{
    res.send({valid:false});
    return;
  }
 })
});


app.get("/api/v1/checkmail", async function(req,res){
  let email = req.query.email;
  let id = req.query.id;
  let emaulInUse = false;
  let eresults = await User.find({email:new RegExp(email, 'i')});
    for(var i = 0; i < eresults.length; i++){
      if(eresults[i].email.toLowerCase() == email.toLowerCase()){  
        if(id){
         if(eresults[i].id == id){
          emaulInUse = false;
         }else{
          emaulInUse = true;
         }
        }else{
          emaulInUse = true;
        } 
      }
}
  res.send(`{"mail":${emaulInUse}}`);
})



app.post("/api/v1/newdevice", function(req,res){
  let id = req.body.id;
  let token = req.body.token;
  let deviceID = req.body.deviceID;
  let deviceName = req.body.deviceName;
  if(!deviceName || deviceName.length < 1){
   deviceName = "GeminiPro";
  }
  if(id && token){
    User.findOne({id: id}).then(function(user){
      if(user){
      
       if(user.loggedDevices.includes(token)){
        var device = new Device({id:deviceID, name:deviceName, connectionStatus:"Online", status:{gpioStatus:0, lightAlarm:0, lightAlarmTime: null, ledColors:{current:"0xFF0000",on:"0x0000FF",off:"0xFF0000"}, timer:{timezone: 0, on:null, off:null}}, lastAction:new Date().getTime(), sincricPro:{appKey:null, appSecret:null, switchID: null}});
        device.save()
        user.devices.myDevices.push(deviceID);
        user.save();
        res.send({error:false});
       }else{
        res.send({error:true});
       }
      }else{
        res.send({error:true});
        return;
      }
     })
  }else{
    res.send({error:true});
  }
  
});


app.post("/api/v1/changestate", function(req,res){
  let id = req.body.id;
  let token = req.body.token;
  let deviceID = req.body.deviceID;
  User.findOne({id: id}).then(async function(user){
    if(user){
     if(user.loggedDevices.includes(token)){
      if(user.devices.myDevices.includes(deviceID) || user.devices.sharedDevices.includes(deviceID)){
      Device.findOne({id:deviceID}).then(function(device){
      if(device.status.gpioStatus == 1){
        device.status.gpioStatus = 0;
        device.status.ledColors.current = device.status.ledColors.off;
        device.status.lightAlarmTime = null;
      }else{
        device.status.gpioStatus = 1
        device.status.ledColors.current = device.status.ledColors.on;
      }
      device.save();
      io.to(device.socketID).emit("state", {error:false, gpioStatus:device.status.gpioStatus, ledColor:device.status.ledColors.current, lightAlarm: device.status.lightAlarm});
      });
      res.send({error:false});
      }
     }else{
      res.send({error:true});
     }
    }else{
      res.send({error:true});
      return;
    }
   })
});

app.get("/api/v1/device/changestate", function(req,res){
  let deviceID = req.query.id;
      Device.findOne({id:deviceID}).then(function(device){
        if(device){
      if(device.status.gpioStatus == 1){
        device.status.gpioStatus = 0;
        device.status.ledColors.current = device.status.ledColors.off;
        device.status.lightAlarmTime = null;
      }else{
        device.status.gpioStatus = 1
        device.status.ledColors.current = device.status.ledColors.on;
      }
      device.save();
      res.send({error:false});
    }else{
      res.send({error:true});
    }
      });
});

app.get("/api/v1/device",function(req,res){
let deviceID = req.query.id;
if(deviceID){
 Device.findOne({id:deviceID}).then(function(device){
  if(device){
  if(device.lastAction < new Date(new Date().getTime() - (15 * 1000)).getTime()){
    device.lastAction = new Date().getTime();
    device.connectionStatus = "Online";
    device.save();
  }
  res.send({error:false, gpioStatus:device.status.gpioStatus, ledColor:device.status.ledColors.current, lightAlarm: device.status.lightAlarm});
  }
 });
}else{
  res.send({error:true, gpioStatus:undefined});
}
});

checkDevicesStatus();

async function checkDevicesStatus(){
  let dv = await Device.find({"lastAction":{$lt:new Date(new Date().getTime() - (30 * 1000)).getTime()}});
  for(var i = 0; i < dv.length; i++){
   if(dv[i]){
    dv[i].connectionStatus = "Offline";
    dv[i].save();
   }
  }
  setTimeout(checkDevicesStatus, 10000);
}



checkTimers();


async function checkTimers(){
  let dvON = await Device.find({"status.timer.on":{$lt:new Date().getTime()}});
  let dvOFF = await Device.find({"status.timer.off":{$lt:new Date().getTime()}});
  let dvAL = await Device.find({"status.lightAlarmTime":{$lt:new Date().getTime() - (5 * 60 * 1000)}});
  for(var i = 0; i < dvON.length; i++){
     if(dvON[i].status.timer.on != null){
      dvON[i].status.timer.on = parseInt(dvON[i].status.timer.on) + (1000 * 60 * 60 * 24);
    dvON[i].status.gpioStatus = 1;
    dvON[i].status.ledColors.current = dvON[i].status.ledColors.on;
    dvON[i].save();
  }
  }
  
  for(var i = 0; i < dvOFF.length; i++){
    if(dvOFF[i].status.timer.off != null){
      let newTimer = parseInt(dvOFF[i].status.timer.off) + (1000 * 60 * 60 * 24);
      dvOFF[i].status.timer.off = newTimer;
      dvOFF[i].status.gpioStatus = 0;
      dvOFF[i].status.ledColors.current = dvOFF[i].status.ledColors.off;
      dvOFF[i].save();
 }
 }

 for(var i = 0; i < dvAL.length; i++){
  if(dvAL[i].status.lightAlarmTime != null){
     dvAL[i].status.lightAlarmTime = null;
    dvAL[i].status.gpioStatus = 0;
    dvAL[i].status.ledColors.current = dvAL[i].status.ledColors.off;
    dvAL[i].save();
  }
}
 setTimeout(checkTimers, 3000);
}


app.post("/api/v1/changedevicesettings", function(req,res){
  let timerOn = req.body.timerOn;
  let timerOff = req.body.timerOff;
  let timezone = req.body.timezone;
  let colorOn = req.body.colorOn;
  let colorOff = req.body.colorOff;
  let GAkey = req.body.GAkey;
  let GAID =  req.body.GAID;
  let GAtoken = req.body.GAtoken;
  let lightAlarm = req.body.lightAlarm;
  let id = req.body.id;
  let token = req.body.token;
  let deviceID = req.body.deviceID;
 
  
  if(timerOn){
  timerOn = convertTimestamp(timerOn,timezone);
  }else{
    timerOn = null;
  }
  if(timerOff){
    timerOff = convertTimestamp(timerOff, timezone);
    }else{
      timerOff = null;
    }
  User.findOne({id: id}).then(async function(user){
    if(user){
     if(user.loggedDevices.includes(token)){
      if(user.devices.myDevices.includes(deviceID) || user.devices.sharedDevices.includes(deviceID)){
      Device.findOne({id:deviceID}).then(function(device){
        if(device){
          device.status.ledColors.on = colorOn;
          device.status.ledColors.off = colorOff;
          device.status.timer.on = timerOn;
          device.status.timer.off = timerOff;
          device.status.timer.timezone = timezone;
          device.status.ledColors.off = colorOff;
          device.status.lightAlarm = lightAlarm;
          if(device.status.gpioStatus == 0){
           device.status.ledColors.current = device.status.ledColors.off
          }else{
            device.status.ledColors.current = device.status.ledColors.on
          }
          if(GAkey && GAID && GAtoken){
           device.sincricPro.switchID =  CryptoJS.AES.encrypt(GAID, process.env.SALT).toString();
           device.sincricPro.appSecret = CryptoJS.AES.encrypt(GAtoken, process.env.SALT).toString();
           device.sincricPro.appKey =  CryptoJS.AES.encrypt(GAkey, process.env.SALT).toString();
          }else{
            GAkey, GAID, GAtoken = null;
          }
          device.save();
          res.send({error:false});
          return;
        }
      });
    }
  }
  else{
    res.send({error:false});
  return;
  }
}else{
  res.send({error:false});
return;
}
  });
});


app.post("/api/v1/device/motion", async function(req,res){
let deviceID = req.query.deviceid;
let owner = await  User.find({"devices.myDevices":deviceID});
let shared = await  User.find({"devices.sharedDevices":deviceID});
let device = await Device.findOne({id:deviceID});
if(device.status.lightAlarm == 1){
  device.status.gpioStatus = 1;
  device.status.ledColors.current = device.status.ledColors.on;
  device.status.lightAlarmTime = new Date().getTime();
  device.save();
for(var i = 0; i < owner.length; i++){
if(owner[i].oneSignal){
  for(var x = 0; x < owner[i].oneSignal.length; x++){
    const notification = {
      contents: {
        'en': `Motion detected, the lights were turned on`,
      },
     include_player_ids: [owner[i].oneSignal[x]],
    };
    client.createNotification(notification);
}
}
}
for(var i = 0; i < shared.length; i++){
  if(shared[i].oneSignal){
    for(var x = 0; x < shared[i].oneSignal.length; x++){
      const notification = {
        contents: {
          'en': `Motion detected, the lights were turned on`,
        },
       include_player_ids: [shared[i].oneSignal[x]],
      };
      client.createNotification(notification);
  }
  }
}
}
});



app.get("/api/v1/device/sinric/boot/getinfo", async function(req,res){
  let deviceID = req.query.id;
  let device = await Device.findOne({id:deviceID});
  if(device){
    if(device.sincricPro.appKey != null && device.sincricPro.appSecret != null && device.sincricPro.switchID != null){
    let sinricKey = CryptoJS.AES.decrypt(device.sincricPro.appKey, process.env.SALT).toString(CryptoJS.enc.Utf8);
    let sinricSecret = CryptoJS.AES.decrypt(device.sincricPro.appSecret, process.env.SALT).toString(CryptoJS.enc.Utf8);
    let sinricID = CryptoJS.AES.decrypt(device.sincricPro.switchID, process.env.SALT).toString(CryptoJS.enc.Utf8);
     res.send({"error":false, sinricKey:sinricKey, sinricSecret:sinricSecret, sinricID:sinricID});
     return;
    }else{
      res.send({"error":true});
      return;
    }
  }else{
  res.send({"error":true});
  return; 
  }
})


app.post("/api/v1/removedevice", function(req,res){
  let id = req.body.id;
  let token = req.body.token;
  let deviceID = req.body.deviceID;
  User.findOne({id: id}).then(async function(user){
    if(user){
     if(user.loggedDevices.includes(token)){
      if(user.devices.myDevices.includes(deviceID)){
      Device.deleteOne({id:deviceID}).then(async function(){
       let users = await User.find({"devices.sharedDevices":deviceID});
       if(users){
        for(var i = 0; i < users.length; i++){
          var dvind = users[i].devices.sharedDevices.indexOf(deviceID);
          if (dvind !== -1) {
            users[i].devices.sharedDevices.splice(dvind, 1); 
            users[i].save();
          }
        }
       }
       var dvind = user.devices.myDevices.indexOf(deviceID);
          if (dvind !== -1) {
            user.devices.myDevices.splice(dvind, 1); 
            user.save();
          }
      })
      } 
    }else{
      res.send({"error":true});
      return; 
      }
  }else{
    res.send({"error":true});
    return; 
    }
})
});




app.post("/api/v1/logout", function(req,res){
  let id = req.body.id;
  let token = req.body.token;
  User.findOne({id: id}).then(async function(user){
    if(user){
     if(user.loggedDevices.includes(token)){
      var dtoken = user.loggedDevices.indexOf(token);
      if (dtoken !== -1) {
        user.loggedDevices.splice(dtoken, 1); 
        user.save();
        res.send({"error":false});
      }
    }else{
      res.send({"error":true});
      return; 
      }
  }else{
    res.send({"error":true});
    return; 
    }
})
});


app.post("/api/v1/changesharelist", function(req,res){
  let id = req.body.id;
  let token = req.body.token;
  let action = req.body.action;
  let suser = req.body.user;
  User.findOne({id: id}).then(async function(user){
    if(user){
     if(user.loggedDevices.includes(token)){
      if(suser != user.email){
      let sharinguser = await User.findOne({email:suser});

      if(sharinguser){
        let ownername = CryptoJS.AES.decrypt(user.username, process.env.SALT).toString(CryptoJS.enc.Utf8);
        if(action == "add"){
          for(var i = 0; i < user.devices.myDevices.length; i++){
          if(!sharinguser.devices.sharedDevices.includes(user.devices.myDevices[i])){
          sharinguser.devices.sharedDevices.push(user.devices.myDevices[i]);
          }
          }
          user.devices.sharingWith.push(sharinguser.id);
          sharinguser.save();
          user.save();
          for(var x = 0; x < sharinguser.oneSignal.length; x++){
          const notification = {
            contents: {
              'en': `${ownername} has added you to their devices sharing list.`,
            },
           include_player_ids: [sharinguser.oneSignal[x]],
          };
          client.createNotification(notification);
        }
          res.send({"error":false});
        }else if(action == "remove"){
          for(var i = 0; i < user.devices.myDevices.length; i++){
            var did = sharinguser.devices.sharedDevices.indexOf(user.devices.myDevices[i]);
            if (did !== -1) {
              sharinguser.devices.sharedDevices.splice(did, 1); 
            }
            }
            sharinguser.save();
            var shls = user.devices.sharingWith.indexOf(sharinguser.id);
            if (shls !== -1) {
              user.devices.sharingWith.splice(shls, 1); 
            }
            user.save();
            for(var x = 0; x < sharinguser.oneSignal.length; x++){
              const notification = {
                contents: {
                  'en': `${ownername} has removed you from their devices sharing list.`,
                },
               include_player_ids: [sharinguser.oneSignal[x]],
              };
              client.createNotification(notification);
            }
            res.send({"error":false});
        }
      }else{
        res.send({"error":true});
        }
      }else{
      res.send({"error":true});
      }
    }else{
      res.send({"error":true});
      return; 
      }
  }else{
    res.send({"error":true});
    return; 
    }
})
});



app.post("/api/v1/editaccount", function(req,res){
 let email = req.body.email;
 let newusername = req.body.username;
 let token = req.body.token;
 let id = req.body.id;
 User.findOne({id: id}).then(async function(user){
  if(user){
   if(user.loggedDevices.includes(token)){
    let username = CryptoJS.AES.decrypt(user.username, process.env.SALT).toString(CryptoJS.enc.Utf8);
   if(user.email !== email){
    user.email = email;
   }
   if(newusername !== username){
    user.username =  CryptoJS.AES.encrypt(newusername, process.env.SALT).toString();
   }
   user.save();
   res.send({"error":false});
   return;
  }else{
    res.send({"error":true});
    return; 
    }
}else{
  res.send({"error":true});
  return; 
  }
})
});


app.post("/api/v1/accountremove", async function(req,res){
  let token = req.body.token;
  let id = req.body.id;
  User.findOne({id: id}).then(async function(user){
   if(user){
    if(user.loggedDevices.includes(token)){
     for(var i = 0; i < user.devices.myDevices.length; i++){
      await Device.deleteOne({id:user.devices.myDevices[i]});
     }
     await User.deleteOne({id:id});
     res.send({"error":false});
    }else{
      res.send({"error":true});
      return; 
      }
  }else{
    res.send({"error":true});
    return; 
    }
})
})


app.post("/api/v1/passchange", async function(req,res){
  let token = req.body.token;
  let id = req.body.id;
  let newpass = req.body.passchange;
  let currentpass = req.body.currentpass;
  User.findOne({id: id}).then(async function(user){
   if(user){
    if(user.loggedDevices.includes(token)){
     if(newpass){
      let verifyPass = bcrypt.compareSync(currentpass, user.password);  
      if(verifyPass){
       bcrypt.hash(newpass, 10, function(err, hash) {
        if(err){
        res.send({"error":true, "message":"Error while generating new password hash."});
        return; 
        }else{
      user.password = hash;
      user.loggedDevices = [];
      user.save()
      res.send({"error":false});
        }
      })
    }else{
      res.send({"error":true, "errorcause": "wrps"});
      return; 
     }
     }else{
      res.send({"error":true, "errorcause": "Missing Data"});
      return; 
     }
    }else{
      res.send({"error":true, "errorcause": "Missing Tokens"});
      return; 
      }
  }else{
    res.send({"error":true, "errorcause": "Invalid User"});
    return; 
    }
})
})

server.listen(process.env.PORT || 3000 || 3001, () => {
    console.log("Listening Ports");
    keepalive();
})


function convertTimestamp(time, timezone){
  let ts = new Date(`${new Date().getMonth()+1} ${new Date().getDate()} ${new Date().getFullYear()} ${time}`).getTime() / 1000;
  timezone = parseFloat(timezone);
  if(timezone < 0){
    timezone = Math.abs(timezone);
  }else if(timezone > 0){
    timezone = -Math.abs(timezone);
  }else{
    timezone = 0;
  }
  let timezoneOffset = 3600 * timezone;
  let ttz = new Date(Math.round(ts + timezoneOffset) * 1000).getTime();
  if(ttz < new Date().getTime()){
    return ttz + (24 * 60 * 60 * 1000);
    }else{
    return ttz;
    }
}

io.on('connection', client => {
  client.on("register", function(data){
  if(data){
    if(data.id){
      console.log(`Device ${data.id} was registered to socket!`)
      Device.findOne({id:data.id}).then(function(device){
      device.socketID = client.id;
      device.save();
      })
    }
  }
  });
  client.on('changedevicestate',function(data){
    console.log("device trigger received");
    if(data){
      if(data.id){
        Device.findOne({id:data.id}).then(function(device){
          if(device){
        if(device.status.gpioStatus == 1){
          device.status.gpioStatus = 0;
          device.status.ledColors.current = device.status.ledColors.off;
          device.status.lightAlarmTime = null;
        }else{
          device.status.gpioStatus = 1
          device.status.ledColors.current = device.status.ledColors.on;
        }
     if(device.lastAction < new Date(new Date().getTime() - (15 * 1000)).getTime()){
       device.lastAction = new Date().getTime();
       device.connectionStatus = "Online";
       device.save();
     }
       client.emit("state", {error:false, gpioStatus:device.status.gpioStatus, ledColor:device.status.ledColors.current, lightAlarm: device.status.lightAlarm});
        console.log("device trigger sent");
          }
        });
      }
    }
  });



});

function keepalive(){
  fetch("https://geminipro-up03.onrender.com");
    setTimeout(keepalive,840000);
  }
