require 'rubygems'
require 'sinatra'

set :public_folder, File.dirname(__FILE__) + '/public'

get '/' do
  erb :index
end