const { body } = require('express-validator');
var modulePath	=	__dirname+'/model/notifications';
var modelPath	=	'/admin/notifications';
	
	app.use(modelPath,(req,res,next)=>{
		req.rendering.views		=	__dirname+'/views'
		next();
	});
	
	/** Routing is used to get listing **/		
	app.all(modelPath,checkLoggedInAdmin,(req,res)=>{
		var notifications	=	require(modulePath);
		notifications.list(req,res);
	});

	/** Routing is used to add detail**/		
	app.all(modelPath+'/add', checkLoggedInAdmin, async (req,res)=>{
		var notifications	=	require(modulePath);
		notifications.addDetail(req,res);
	});

	/** Routing is used to edit detail**/		
	app.all(modelPath+'/edit/:id', checkLoggedInAdmin, async (req,res)=>{
		var notifications	=	require(modulePath);
		notifications.editDetail(req,res);
	});

	/** Routing is used to update detail**/		
	app.all(modelPath+'/update_status/:id/:status',checkLoggedInAdmin,(req,res)=>{
		var notifications	=	require(modulePath);
		notifications.updateStatus(req,res);
	});

	/** Routing is used to update detail**/		
	app.all(modelPath+'/send_notification/:id',checkLoggedInAdmin,(req,res,next)=>{
		var notifications	=	require(modulePath);
		notifications.sendNotification(req,res,next);
	});

	/** Routing is used to save notification and send to selected **/		
	app.all(modelPath+'/send',checkLoggedInAdmin,(req,res,next)=>{
		var notifications	=	require(modulePath);
		notifications.sendNotification(req,res,next);
	});
	
