/** Model file path for current plugin **/
const modelPath  				= 	__dirname+"/model/pricing_packages";
const modulePath				= 	"/"+ADMIN_NAME+"/pricing_packages/";
const adminPricingPackages 	=	require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views";
    next();
});


/** Routing is used to get Pricing Packages list **/
app.all(modulePath+":type",checkLoggedInAdmin,(req, res) => {
	adminPricingPackages.getPricingPackagesList(req, res);
});

/** Routing is used to add or edit Pricing Packages **/
app.all([modulePath+":type/add",modulePath+":type/edit/:id"],checkLoggedInAdmin,(req, res, next) => {
	adminPricingPackages.addEditPricingPackages(req, res, next);
});

/** Routing is used to delete Pricing Packages details **/
app.get(modulePath+":type/delete/:id",checkLoggedInAdmin,(req, res, next) => {
	adminPricingPackages.pricingPackagesDelete(req, res, next);
});
