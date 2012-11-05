GITHUB = 'https://api.github.com/';
IDENTITY = '?client_id=b64b63fabc4c7c64aa05&client_secret=b282829f3f3a149d56a48cc1ea3e0aad91e3ed29'
var Scraper = function() {  
    this.getUserData = function(USER, user_def) {
        if (typeof Storage !== 'undefined' && localStorage[USER]) {
            var user = JSON.parse(localStorage.getItem(USER));
            if(((new Date()) - Date.parse(user.processed)) / 1000 < 60*60*24) {
                user_def.resolve(user);
                return;
            }
        } 

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
        var promises = [];
        var defer = $.Deferred();
        promises.push();
        promises.push($.get(GITHUB + 'users/' + USER + IDENTITY, function(data) {
            data = data.data;
            followers = data.followers;
            createdAt = data.created_at;
            userData = data;
        }, 'jsonp'));
        var promise_count = 0;

        promises.push($.Deferred(function (def) {
            $.get(GITHUB + 'users/' + USER + '/orgs' + IDENTITY+ '&per_page=100',
                function(data) {
                    data = data.data;
                    orgs += data.length;
                    def.resolve();
                },
                'jsonp')
            })
        );

        promises.push($.Deferred(function (def) {
            $.get(GITHUB + 'users/' + USER + '/gists' + IDENTITY + '&per_page=100',
                function(data) {
                    data = data.data;
                    gists += data.length;
                    def.resolve();
                },
                'jsonp')
            })
        );

        promises.push(
            $.Deferred(function (top_def) {
                $.get(GITHUB + 'users/' + USER + '/repos' + IDENTITY + '&per_page=100', 
                    function(data) {
                        data = data.data;
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
                            user_def.resolve({
                                age: createdAt,
                                followers: followers,
                                forks: forks,
                                stars: stars,
                                commits: commits,
                                repositories: repos,
                                organiations: orgs,
                                gists: gists
                            });
                        });
                    }, 
                    'jsonp');
            })
        );

        function getNumberCount(url, def) {
            var count = 0;
            var promise;
            $.ajax({
                url: url,
                async: false,
                success: function(resp, status, obj) {
                    linkHeader = obj.getResponseHeader('Link');
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
            $.get(
                url,
                function(resp, status, obj) {
                    if(resp.data.message && resp.data.message === "Git Repository is empty.") {
                        def.resolve();
                        return;
                    }
                    commits += resp.data.length;
                    linkHeader = resp.meta.Link;
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
                },
                'jsonp'
            );
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
            linkHeader.forEach(function(e) {
                var verb = e[1].rel;
                if(verb == 'next') {
                    next = true;
                    nextLink = e[0];
                }
            });
            return {
                hasNext: next,
                nextLink: nextLink
            }
        }
    }
}