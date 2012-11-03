require 'rubygems'
require 'sinatra'

set :public_folder, 'static'

get '/' do
  erb :index
end