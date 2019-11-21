<template>
  <v-app id="inspire">
    <v-navigation-drawer
      v-model="drawerRight"
      app
      clipped
      right
    >
      <v-list dense>
        <v-list-item @click.stop="right = !right">
          <v-list-item-action>
            <v-icon>mdi-exit-to-app</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Open Temporary Drawer</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar
      app
      clipped-right
      color="blue-grey"
      dark
      dense
    >
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-toolbar-title>Scruto</v-toolbar-title>
      <v-spacer />

      <OmniSearch/>

      <v-btn icon>
        <v-icon>mdi-dots-vertical</v-icon>
      </v-btn>
      
      <v-spacer />

      <v-btn icon>
        <v-icon>mdi-magnify</v-icon>
      </v-btn>
      <v-app-bar-nav-icon @click.stop="drawerRight = !drawerRight" />
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      app
    >
      <v-list dense>
        <v-list-item @click.stop="left = !left">
          <v-list-item-action>
            <v-icon>mdi-exit-to-app</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Open Temporary Drawer</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-navigation-drawer
      v-model="left"
      fixed
      temporary
    />

    
    <v-content>
      <SessionPane :session_id="1"/>
      <v-divider></v-divider>
      <SessionPane :session_id="2"/>
      <v-divider></v-divider>
      <SessionPane :session_id="3"/>
    </v-content>

    <v-navigation-drawer
      v-model="right"
      fixed
      right
      temporary
    />

    <v-footer
      app
      color="blue-grey"
      class="white--text"
      style="z-index: 5"
    >
      <span>Vuetify</span>
      <v-spacer />
      <span>&copy; 2019</span>
    </v-footer>
  </v-app>
</template>

<script>
  import SessionPane from './SessionPane';
  import OmniSearch from './OmniSearch';
  export default {
    components: {
      OmniSearch,
      SessionPane,
    },
    props: {
      source: String,
    },

    data: () => ({
      drawer: false,
      drawerRight: false,
      right: false,
      left: false,
    }),
  }
</script>