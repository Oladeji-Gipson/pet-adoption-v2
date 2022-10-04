const  validBody = (schema)  => {
  return (req,res,next) => {
   const validateResults = schema.validate(req.body, {abortEarly: false});
   if(validateResults.error) {
    return res.status(400).json({error: validateResults.error})
   } else {
    req.body = validateResults.value;
    next();
   }
  }
}

module.exports = validBody;