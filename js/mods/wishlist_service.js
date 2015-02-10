var wishlistService = angular.module('WishlistService', ['ServiceMod', 'ionic']);

wishlistService.factory('wishlistHelper', [
    'ajaxRequest', '$q', 'toast', '$localStorage', '$location', 'timeStorage', '$ionicLoading', 'notifyHelper',
    function (ajaxRequest, $q, toast, $localStorage, $location, timeStorage, $ionicLoading, notifyHelper) {
        var service = {};

        service.getUrlImage = function (url) {
            var def = $q.defer();

            var ajax = ajaxRequest.send('v1/picture/extract?url=' + encodeURIComponent(url), {}, 'GET');
            ajax.then(function (data) {
                def.resolve(data);
            }, function (message) {
                def.reject();
            });
            return def.promise;
        };

        service.remove = function (item_id, list_id) {
            var def = $q.defer();

            if ($localStorage.user && $localStorage.user.id) {
                var ajax = ajaxRequest.send('v1/wishlist/item/remove', {
                    user_id: $localStorage.user.id,
                    item_id: item_id,
                    list_id: list_id
                });
                ajax.then(function (data) {
                    def.resolve();
                }, function (message) {
                    def.reject({
                        login: 0,
                        message: message
                    });
                });
            } else {
                $location.path('/app/signup');
                toast.showShortBottom('SignUp To Setup Wishlist and Price Alerts');
                def.reject({
                    login: 1
                });
            }
            return def.promise;
        };
        service.getListName = function (list_id) {
            var user_wish_list = timeStorage.get('user_wish_list');
            if (user_wish_list.me) {
                for (var i = 0; i < user_wish_list.length; i++) {
                    if (user_wish_list[i]._id === list_id) {
                        return user_wish_list[i].name;
                    }
                }
            }
            return "";
        };
        service.incListPriority = function (list_id) {
            var user_wish_list_pri = timeStorage.get('user_wish_list_pri');
            if (!user_wish_list_pri) {
                user_wish_list_pri = {};
            }
            if (!user_wish_list_pri[list_id]) {
                user_wish_list_pri[list_id] = 0;
            }
            user_wish_list_pri[list_id]++;
            timeStorage.set('user_wish_list_pri', user_wish_list_pri, 24);
        }
        service.sortList = function (list) {
            var me = list.me;
            var user_wish_list_pri = timeStorage.get('user_wish_list_pri');
            if (me && user_wish_list_pri) {
                for (var i = 0; i < me.length; i++) {
                    if (user_wish_list_pri[me[i]._id]) {
                        me[i].sort_order = user_wish_list_pri[me[i]._id];
                    } else {
                        me[i].sort_order = 0;
                    }
                }
                list.me = me;
            }
            return list;
        }
        service.list = function (force, showLoading) {
            var self = this;
            if (!angular.isDefined(showLoading)) {
                showLoading = true;
            }
            if (!angular.isDefined(force)) {
                force = false;
            }
            var def = $q.defer();
            var user_wish_list = timeStorage.get('user_wish_list');
            if (user_wish_list && !force) {
                return $q.when(self.sortList(angular.copy(user_wish_list)));
            } else if ($localStorage.user && $localStorage.user.id) {
                if (user_wish_list) {
                    def.notify(self.sortList(angular.copy(user_wish_list)));
                }
                if (showLoading)
                    $ionicLoading.show({
                        template: 'Loading...'
                    });
                var ajax = ajaxRequest.send('v1/wishlist/list', {
                    user_id: $localStorage.user.id
                });
                ajax.then(function (data) {
                    if (showLoading)
                        $ionicLoading.hide();
                    timeStorage.set('user_wish_list', data, 12);

                    def.resolve(self.sortList(data));
                }, function (message) {
                    if (showLoading)
                        $ionicLoading.hide();
                    def.reject({
                        login: 0,
                        message: message
                    });
                });
                return def.promise;
            } else {
                $location.path('/app/signup');
                toast.showShortBottom('SignUp To Setup Wishlist and Price Alerts');
                def.reject({
                    login: 1
                });
                return def.promise;
            }
        };
        service.listItems = function (list_id, page) {
            var def = $q.defer();
            if ($localStorage.user && $localStorage.user.id) {
                var ajax = ajaxRequest.send('v1/wishlist/item/list', {
                    user_id: $localStorage.user.id,
                    list_id: list_id,
                    page: page
                });
                ajax.then(function (data) {
                    def.resolve(data);
                }, function (message) {
                    def.reject(message);
                });
            } else {
                $location.path('/app/signup');
                toast.showShortBottom('SignUp To Setup Wishlist and Price Alerts');
                def.reject({
                    login: 1
                });
            }
            return def.promise;
        };
        service.create = function (list) {
            var def = $q.defer();
            if ($localStorage.user && $localStorage.user.id) {
                list.user_id = $localStorage.user.id;
                var ajax = ajaxRequest.send('v1/wishlist/add', list);
                ajax.then(function (data) {
                    def.resolve(data);
                }, function (message) {
                    def.reject(message);
                });
            } else {
                $location.path('/app/signup');
                toast.showShortBottom('SignUp To Setup Wishlist and Price Alerts');
                def.reject({
                    login: 1
                });
            }
            return def.promise;
        };
        service.addItem = function (item, list_id) {
            var def = $q.defer();

            if ($localStorage.user && $localStorage.user.id) {
                var ajax = ajaxRequest.send('v1/wishlist/item/add', {
                    user_id: $localStorage.user.id,
                    item: item,
                    list_id: list_id,
                    type: 'custom'
                });
                ajax.then(function (data) {
                    def.resolve(data);

                    if (data.list) {
                        var followers = data.list.followers;
                        var shared_ids = data.list.shared_ids;
                        if (shared_ids.length > 0) {
                            notifyHelper.addUpdate(shared_ids, 'item_add', data);
                            for (var i = 0; i < shared_ids.length; i++) {
                                notifyHelper.sendAlert('user_' + shared_ids[i], {
                                    title: 'New Item Added',
                                    alert: 'Item Added To List ' + data.list.name + " by " + $localStorage.user.name,
                                    type: 'item_add',
                                    meta: {
                                        wishlist_model: data.wishlist_model,
                                        list: data.list,
                                        user: $localStorage.user
                                    }
                                });
                            }
                        } else if (followers.length > 0) {
                            //followers only if no shared ids
                            notifyHelper.addUpdate(followers, 'item_add', data);
                            notifyHelper.sendAlert('list_' + data.list._id, {
                                title: 'New Item Added',
                                alert: 'Item Added To List ' + data.list.name + " by " + $localStorage.user.name,
                                meta: {
                                    type: 'item_add',
                                    wishlist_model: data.wishlist_model,
                                    list: data.list,
                                    user: $localStorage.user
                                }
                            });


                            var user_followers = data.user.followers;
                            var filtered_user_followers = [];
                            for (var i = 0; i < user_followers.length; i++) {
                                var follower = user_followers[i];
                                if (followers.indexOf(follower) === -1) {
                                    filtered_user_followers.push(follower);
                                }
                                notifyHelper.addUpdate(filtered_user_followers, 'item_add_user', data);
                                notifyHelper.sendAlert('user_follower_' + $localStorage.user.id, {
                                    title: 'New Item Added',
                                    alert: 'Item Added To List ' + data.list.name + " by " + $localStorage.user.name,
                                    meta: {
                                        type: 'item_add_user',
                                        wishlist_model: data.wishlist_model,
                                        list: data.list,
                                        user: $localStorage.user
                                    }
                                });
                            }
                        }


                        //need to post to user followers as well
                    }

                }, function (message) {
                    def.reject({
                        login: 0,
                        message: message
                    });
                });
            } else {
                $location.path('/app/signup');
                toast.showShortBottom('SignUp To Setup Wishlist and Price Alerts');
                def.reject({
                    login: 1
                });
            }
            return def.promise;
        };
        service.viewItem = function (item_id, list_id) {
            var def = $q.defer();

            var ajax = ajaxRequest.send('v1/wishlist/item/view/' + item_id + "/" + list_id, {}, 'GET');
            ajax.then(function (data) {
                def.resolve(data);
            }, function (message) {
                def.reject(message);
            });
            return def.promise;
        };
        service.add = function (product_id, list_id) {
            var def = $q.defer();

            if ($localStorage.user && $localStorage.user.id) {
                var ajax = ajaxRequest.send('v1/wishlist/item/add', {
                    user_id: $localStorage.user.id,
                    product_id: product_id,
                    list_id: list_id,
                    type: 'product'
                });
                ajax.then(function (data) {
                    def.resolve(data);
                }, function (message) {
                    def.reject({
                        login: 0,
                        message: message
                    });
                });
            } else {
                $location.path('/app/signup');
                toast.showShortBottom('SignUp To Setup Wishlist and Price Alerts');
                def.reject({
                    login: 1
                });
            }
            return def.promise;
        };
        return service;
    }
]);