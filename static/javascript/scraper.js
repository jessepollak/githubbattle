(function() {
    var GITHUB = 'https://api.github.com/';
    var IDENTITY = '?client_id=b64b63fabc4c7c64aa05&client_secret=b282829f3f3a149d56a48cc1ea3e0aad91e3ed29'
    var USER = 'jessepollak'
    var forks = 0,
        stars = 0,
        subscribers = 0,
        createdAt,
        userData,
        followers = 0,
        commits = 0,
        repos = 0,
        orgs = 0,
        gists = 0;

    var user1 = {};
    var p = 
        $.Deferred(function (def) {
            getUserData('jessepollak', user1,  def)
        });

    $.when(p).done(function() { console.log(user1); })
    function getUserData(USER, results, user_def) {
        var promises = [];
        var defer = $.Deferred();
        promises.push();
        promises.push($.get(GITHUB + 'users/' + USER + IDENTITY, function(data) {
            followers = data.followers;
            createdAt = data.created_at;
            userData = data;
        }, 'json'));
        var promise_count = 0;

        promises.push($.Deferred(function (def) {
            $.get(GITHUB + 'users/' + USER + '/orgs' + IDENTITY,
                function(data) {
                    orgs += data.length;
                    def.resolve();
                },
                'json')
            })
        );

        promises.push($.Deferred(function (def) {
            $.get(GITHUB + 'users/' + USER + '/gists' + IDENTITY,
                function(data) {
                    gists += data.length;
                    def.resolve();
                },
                'json')
            })
        );

        promises.push(
            $.Deferred(function (top_def) {
                $.get(GITHUB + 'users/' + USER + '/repos' + IDENTITY, 
                    function(data) {
                        repos += data.length;
                        for(var i = 0; i < data.length; i++) {
                            var e = data[i];
                            if(!e.fork) {
                                forks += e.forks;
                            }
                            stars += e.watchers;
                            promises.push($.Deferred(function (def) {
                                getCommitCount(GITHUB + 'repos/' + 
                                USER + '/' + e.name + '/commits' + IDENTITY
                                + '&per_page=100&author=' + USER, def);
                            }));
                        }

                        
                        top_def.resolve();
                        $.when.apply(null, promises).done(function(args1, args2) {
                            results.age = createdAt;
                            results.followers = followers;
                            results.forks = forks;
                            results.stars = stars;
                            results.commits = commits;
                            results.repositories = repos;
                            results.organizations = orgs;
                            results.gists = gists;
                            user_def.resolve();
                        });
                    }, 
                    'json');
            })
        );
    }
    

    function getNumberCount(url, def) {
        var count = 0;
        var promise;
        $.ajax({
            url: url,
            async: false,
            success: function(resp, status, obj) {
                linkHeader = obj.getResponseHeader('Link');
                console.log(linkHeader);
                if(linkHeader) {
                    var last = hasLast(linkHeader);
                    if(last.hasLast) {
                        count += 100*(last.lastNumber - 1);
                        $.ajax({
                            url: last.lastLink,
                            async: false,
                            success: function(resp) {
                                count += resp.length;
                            }
                        });
                    } 
                } 
            }
        });

        if(def) {
            def.resolve();
        }
        return count;
    }

    function getCommitCount(url, def) {
        $.ajax({
            url: url,
            success: function(resp, status, obj) {
                commits += resp.length;
                linkHeader = obj.getResponseHeader('Link');
                if(linkHeader) {
                    var next = hasNext(linkHeader);
                    if(next.hasNext) {
                        getCommitCount(next.nextLink, def);
                    } else {
                        if(def && def.state() == 'pending') {
                            def.resolve();
                        }
                    }
                }  else {
                    if(def && def.state() == 'pending') {
                        def.resolve();
                    }
                }
            }
        });
    }

    function hasLast(linkHeader) {
        var last = false;
        var lastNumber;
        linkHeader.split(',').forEach(function(e) {
            var linkParts = e.split(';');
            var verb = linkParts[1].match(/rel=\"(.*)\"/)[1];
            if(verb == 'last') {
                last = true;
                lastNumber = parseInt(linkParts[0].match(/page=(.*)&/)[1]);
                lastLink = linkParts[0].match(/\<(.*)\>/)[1];
            }
        });
        return {
            hasLast: last,
            lastNumber: lastNumber,
            lastLink: lastLink
        }
    }

    function hasNext(linkHeader) {
        var next = false;
        var nextLink;
        linkHeader.split(',').forEach(function(e) {
            var linkParts = e.split(';');
            var verb = linkParts[1].match(/rel=\"(.*)\"/)[1];
            if(verb == 'next') {
                next = true;
                nextLink = linkParts[0].match(/\<(.*)\>/)[1];
            }
        });
        return {
            hasNext: next,
            nextLink: nextLink
        }
    }
})();