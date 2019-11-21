<template>
  <Container/>
</template>

<script>
import HelloWorld from './components/HelloWorld';
// import SessionPane from './components/SessionPane';
import Container from './components/Container';

export default {
  name: 'App',
  mounted() {
    const self = this
    
    window.addEventListener("keyup", function(e) {
      if( (e.keyCode == 113) ||(e.keyCode == 80 && (e.metaKey || e.ctrlKey))) {
        document.getElementById('omnibox').focus(); 
        // preventDefault();
      }
    });
    window.addEventListener("keydown", function(e) {
      if(e.keyCode == 190 && e.altKey) {
        let session_id = self.$store.active.session
        self.$store.sessions[session_id].active_tab = self.$store.sessions[session_id].active_tab + 1
        self.$store.sessions[session_id].jetable.setData(self.$store.test.jetable.data)
      }
    });
    window.addEventListener("keydown", function(e) {
      if(e.keyCode == 188 && e.altKey) {
        let session_id = self.$store.active.session
        self.$store.sessions[session_id].active_tab = self.$store.sessions[session_id].active_tab - 1
        self.$store.sessions[session_id].jetable.setData(self.$store.test.jetable.data)
      }
    });
  },
  components: {
    Container,
    HelloWorld,
    // SessionPane,
  },
  data: () => ({
    //
  }),
};
</script>


<style>

.padding-zero {
  padding: 0px
}
</style>