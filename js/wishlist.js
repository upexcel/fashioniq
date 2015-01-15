var wishlistMod = angular.module('WishlistMod', ['ServiceMod', 'ngStorage', 'ionic', 'WishlistService']);

wishlistMod.controller('WishlistCtrl',
        ['$scope', '$localStorage', 'toast', 'wishlistHelper', '$location', 'dataShare',
            function ($scope, $localStorage, toast, wishlistHelper, $location, dataShare) {
                if ($localStorage.user.id) {
                    $scope.wishlist = [];
                    $scope.loading = true;
                    var ajax = wishlistHelper.list(true, false);
                    ajax.then(function (data) {
                        $scope.wishlist_mine = angular.copy(data.me);
                        $scope.wishlist_their = angular.copy(data.their);
                        $scope.loading = false;
                    }, function () {
                        $scope.loading = false;
                    }, function (data) {
                        $scope.wishlist_mine = angular.copy(data.me);
                        $scope.wishlist_their = angular.copy(data.their);
                    });

                    $scope.viewList = function (list) {
                        var list_id = list._id;
                        console.log('/app/wishlist_item/' + list_id + "/" + list.name);
                        $location.path('/app/wishlist_item/' + list_id + "/" + list.name);
                    }
                    $scope.editList = function (list) {
                        dataShare.broadcastData(list, 'edit_list');
                        $location.path('/app/wishlist_edit');
                    }

                } else {
                    toast.showShortBottom('You Need To Be Logged In To Access This Page');
                    $location.path('/app/register');
                }
            }
        ]);