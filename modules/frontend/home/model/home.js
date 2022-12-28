const asyncParallel		= require("async/parallel");
const asyncForEachOf  	= require("async/forEachOf");
const { ObjectId }      = require("mongodb");

function Home(req, res) {

  /** Function is to get cms */
  this.getCms = (req, res)=> {
    req.body          = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let slug  = (req.body && req.body.slug)  ? req.body.slug : '';
    let languageId = (req.body.languageId) ? req.body.languageId : ENGLISH_LANGUAGE_MONGO_ID

    if(!slug) return res.send({
      status    : API_STATUS_ERROR,
      result    : {},
      error     : res.__("front.system.data_missing"),
      message   : res.__("front.system.data_missing")
    });

    const collection = db.collection("pages");
    collection.aggregate([
      {$match:{
        slug        : slug
      }},
      {$project:{
        name       : "$pages_descriptions."+languageId+".name",
        description : "$pages_descriptions."+languageId+".body"
      }}
      ]).toArray((err, result) => {
        if(!err){
          return res.send({
            status    : API_STATUS_SUCCESS,
            error     : "",
            result    : (result) ? result[0] : {},
            message   : ''
          });
        }else{
          return res.send({
            status      : API_STATUS_ERROR,
            error       : res.__("front.system.something_went_wrong"),
            result      : {},
            message     : res.__("front.system.something_went_wrong")
          });
        }
      }
    )
  }

  /** Function is to get home page data */
  this.getHomePageData = (req, res,next, pageName)=> {
    req.body  = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    let languageId  = (req.body.languageId) ? req.body.languageId : ENGLISH_LANGUAGE_MONGO_ID;

    asyncParallel([
      (callback)=>{
        /** Get list of faq **/
        let collection = db.collection("faqs");
        collection.find({}).toArray((err,result)=>{
          callback(err, result);
        });
      },
      (callback)=>{
        /** Get list of testimonials **/
        let collection = db.collection("testimonials");
        collection.find({}).toArray((err,result)=>{
          let options = {
            file_url    : TESTIMONIAL_FILE_URL,
            file_path   : TESTIMONIAL_FILE_PATH,
            database_field : "image",
            result      : result
          };
          appendFileExistData(options).then((response) => {
            callback(err, response.result);
          })
        });
      },
      (callback)=>{
        /** Get cms detail **/
        let collection = db.collection("pages");
        collection.findOne({slug : "about-us-web"},{projection:{name:1,body:1}},(err,result)=>{
          callback(err, result);
        });
      },
      (callback)=>{
        /** Get cms detail **/
        let collection = db.collection("pages");
        collection.findOne({slug : "terms-and-condtions"},{projection:{name:1,body:1}},(err,result)=>{
          callback(err, result);
        });
      },
      (callback)=>{
        /** Get cms detail **/
        let collection = db.collection("pages");
        collection.findOne({slug : "privacy-policy"},{projection:{name:1,body:1}},(err,result)=>{
          callback(err, result);
        });
      }
    ],
    (error, response)=>{
      if(error){
        
        return res.render(pageName,{
          status          : API_STATUS_ERROR,
          message         : res.__("front.something_went_wrong_please_try_again_later"),
          error           : res.__("front.something_went_wrong_please_try_again_later"),
          faqs            : (response[0]) ? response[0] : [],
          testimonials    : (response[1]) ? response[1] : [],
          about_us        : (response[2]) ? response[2] : {},
          terms_condtions : (response[3]) ? response[3] : {},
          privacy_policy  : (response[4]) ? response[4] : {}
        })
      }

      return res.render(pageName,{
        status          : API_STATUS_SUCCESS,
        error           : '',
        message         : '',
        settings        : (res.locals.settings) ? res.locals.settings : {},
        faqs            : (response[0]) ? response[0] : [],
        testimonials    : (response[1]) ? response[1] : [],
        about_us        : (response[2]) ? response[2] : {},
        terms_condtions : (response[3]) ? response[3] : {},
        privacy_policy  : (response[4]) ? response[4] : {}
      });
    });
  }

  /** Function is used to save contact us detail**/
  this.contactUs = async(req, res, next)=> {
    req.body      = sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
    req.checkBody({	
      "full_name":{
        notEmpty		:true,
        errorMessage	:res.__("front.this_field_is_required")
      },
      "email":{
        notEmpty		:true,
        errorMessage	:res.__("front.this_field_is_required")
      },
      "message":{
        notEmpty		:true,
        errorMessage	:res.__("front.this_field_is_required")
      },
    });

    
    let fullName  = (req.body.full_name)? req.body.full_name :'';
    let email     = (req.body.email)    ? req.body.email :'';
    let message   = (req.body.message)  ? req.body.message :'';


    /** Set insertable data */
    let insertData = {
      full_name      : fullName,
      email     : email,
      message   : message,
      created   : getUtcDate()
    }

    let errors  = parseValidation(req.validationErrors());
    errors      = (errors && errors.length>NOT) ? errors :  [];

    if(errors && errors.length == NOT){
      const collection	=	db.collection("contact_us");
      collection.insert(insertData, async(error,result)=>{
        if(!error){

          // /*** Start send notification */
          //   let notificationMessageParams = [];
          //   let currentTemplates        = await notificationTemplates(req,res,NOTIFICATION_USER_CONTACT_US); 
          //   let notificationOptions = {
          //     notification_data : {
          //       notification_title    : (currentTemplates.subject)     ? currentTemplates.subject :'',
          //       notification_message  : (currentTemplates.description) ? currentTemplates.description :'',
          //       message_params        : notificationMessageParams,
          //       user_id               : [DEFAULT_MONGOID]
          //     }
          //   };
          //   await insertNotifications(req,res,notificationOptions);
          // /*** End send notification */


          return res.send({
            status        : API_STATUS_SUCCESS,
            error         : '',
            result        : {},
            message       : res.__("front.user.thanks_for_contact_us"),
          })
        }else{
          return res.send({
            status        : API_STATUS_ERROR,
            error         : res.__("front.something_went_wrong_please_try_again_later"),
            result        : {},
            message       : res.__("front.something_went_wrong_please_try_again_later"),
          })
        }
      })
    }else{
      res.send({
        status	:	API_STATUS_ERROR,
        error		:	errors[0],
        result  : '',
        message : ''
      });
    }
  }

}
module.exports = new Home();
