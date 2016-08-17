# Diddy Deploy Dat

A deployment tool geared primarily for @RevoltTV's deployment process, but may
be beneficial/extensible to other deployment patterns.

This tool performs the following primary tasks:

1. Create a new Docker build with appropriate tags
2. Push this new Docker build to Amazon Elastic Container Repository
3. Create/Update an Elastic Container Service task with the new build
4. Create/Update an Elastic Container Service service to redeploy with the new build
5. Ensure the new services start correctly, and perform any cleanup of old resources
