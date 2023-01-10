/** Model file path for current plugin **/
const modelPath  			= 	__dirname+"/model/transactions";
const modulePath			= 	"/"+ADMIN_NAME+"/transactions/";
const adminTransactions 	=	require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views";
    next();
});


/** Routing is used to get transaction list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	adminTransactions.getTransactionList(req, res);
});
